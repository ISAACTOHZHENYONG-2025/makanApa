import * as readline from "readline";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeVenueDiet } from "../../src/lib/diet";
import { formatPriceRange, parsePriceRange, venuePriceRange } from "../../src/lib/price";
import type { HalalStatus, Venue } from "../../src/lib/types";
import { connectFirestore } from "../lib/firestore";

const MAX_PRICE_MYR = 200;

// Reads the range, or the old single avgPriceMYR on venues not yet re-imported from the sheet.
function venuePriceFields(data: Record<string, unknown>) {
  const range = venuePriceRange(data);
  return range ? { priceMinMYR: range.min, priceMaxMYR: range.max } : {};
}

const db = connectFirestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (ans) => resolve(ans.trim()));
  });
}

interface VenueDoc {
  id: string;
  name: string;
  location: string;
  priceMinMYR?: number;
  priceMaxMYR?: number;
  isHalal: HalalStatus;
  dietaryTags: string[];
  menuItems: { itemName: string; priceMYR: number }[];
}

async function listVenues(): Promise<VenueDoc[]> {
  const snapshot = await db.collection("venues").get();
  const venues: VenueDoc[] = [];

  snapshot.forEach((d) => {
    const data = d.data();
    venues.push({
      id: d.id,
      name: data.name || "Unnamed",
      location: data.location || "Unknown",
      ...venuePriceFields(data),
      isHalal: normalizeVenueDiet(data as Venue).isHalal ?? "unknown",
      dietaryTags: Array.isArray(data.dietaryTags) ? data.dietaryTags : [],
      menuItems: Array.isArray(data.menuItems) ? data.menuItems : [],
    });
  });

  return venues;
}

async function handleViewAll() {
  console.log("\n⏳ Fetching venues from Cloud Firestore...");
  const venues = await listVenues();

  if (venues.length === 0) {
    console.log("⚠️ No venues found in the 'venues' collection.");
    return;
  }

  console.log(`\n================== ALL CAMPUS VENUES (${venues.length}) ==================`);
  venues.forEach((v, idx) => {
    console.log(`\n[${idx + 1}] ${v.name}`);
    console.log(`    ID:             ${v.id}`);
    console.log(`    Location:       ${v.location}`);
    console.log(`    Price Range:    ${v.priceMinMYR === undefined ? "None" : `RM${formatPriceRange({ min: v.priceMinMYR, max: v.priceMaxMYR! })}`}`);
    console.log(`    Halal:          ${v.isHalal === "halal" ? "Yes ✅" : v.isHalal === "non-halal" ? "No ❌" : "Unknown ❔"}`);
    console.log(`    Tags:           ${v.dietaryTags.join(", ") || "None"}`);
    if (v.menuItems.length > 0) {
      console.log(`    Menu (${v.menuItems.length} items):`);
      v.menuItems.forEach((m) => {
        console.log(`      • ${m.itemName} - RM${Number(m.priceMYR).toFixed(2)}`);
      });
    }
  });
  console.log("===============================================================");
}

async function handleAdd() {
  console.log("\n--- ADD NEW CAMPUS VENUE ---");
  const name = await ask("Venue Name (e.g. KK2 Cafe): ");
  if (!name) {
    console.log("❌ Cancelled: Name cannot be empty.");
    return;
  }
  const location = await ask("Location (e.g. 2nd Residential College): ");
  const priceStr = await ask("Price range in MYR (e.g. 8-15): ");
  const halalStr = await ask("Is it Halal? (y/n, Enter for unknown): ");
  const tagsStr = await ask("Dietary tags (comma-separated, e.g. Halal, Budget, Noodles): ");

  const parsedPrice = parsePriceRange(priceStr, MAX_PRICE_MYR);
  const price = parsedPrice instanceof Error || !parsedPrice ? { min: 8, max: 15 } : parsedPrice;
  const isHalal: HalalStatus = ["y", "yes"].includes(halalStr.toLowerCase()) ? "halal" : ["n", "no"].includes(halalStr.toLowerCase()) ? "non-halal" : "unknown";
  const dietaryTags = tagsStr
    ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
    : ["Campus Dining"];

  console.log("\nAdd Menu Items (press Enter with empty name when done):");
  const menuItems: { itemName: string; priceMYR: number }[] = [];
  while (true) {
    const itemName = await ask(`  Item #${menuItems.length + 1} Name (or Enter to finish): `);
    if (!itemName) break;
    const itemPriceStr = await ask(`  Price for '${itemName}' (e.g. 7.50): `);
    const priceMYR = parseFloat(itemPriceStr) || 0;
    menuItems.push({ itemName, priceMYR });
  }

  const newDoc = {
    name,
    location: location || "Universiti Malaya",
    priceMinMYR: price.min,
    priceMaxMYR: price.max,
    isHalal,
    dietaryTags,
    menuItems,
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.collection("venues").add(newDoc);
  console.log(`\n✅ Venue added successfully with ID: ${docRef.id}`);
}

async function handleEdit() {
  console.log("\n--- EDIT CAMPUS VENUE ---");
  const venues = await listVenues();
  if (venues.length === 0) {
    console.log("No venues to edit.");
    return;
  }

  venues.forEach((v, idx) => console.log(`  [${idx + 1}] ${v.name} (${v.id})`));
  const pickStr = await ask("\nEnter number to edit (or 'q' to cancel): ");
  if (pickStr.toLowerCase() === "q") return;

  const idx = parseInt(pickStr) - 1;
  const target = venues[idx];
  if (!target) {
    console.log("❌ Invalid selection.");
    return;
  }

  console.log(`\nEditing: ${target.name} (Press Enter to keep current value)`);
  const name = await ask(`New Name [${target.name}]: `);
  const location = await ask(`New Location [${target.location}]: `);
  const currentPrice = target.priceMinMYR === undefined ? "none" : formatPriceRange({ min: target.priceMinMYR, max: target.priceMaxMYR! });
  const priceStr = await ask(`New Price Range, e.g. 8-15 [${currentPrice}]: `);
  const halalStr = await ask(`Is Halal? (y/n/unknown) [${target.isHalal}]: `);

  const updates: Partial<Omit<VenueDoc, "id">> & { avgPriceMYR?: FieldValue } = {};
  if (name) updates.name = name;
  if (location) updates.location = location;
  const newPrice = parsePriceRange(priceStr, MAX_PRICE_MYR);
  if (newPrice instanceof Error) console.log(`⚠️ Price not changed: ${newPrice.message}`);
  else if (newPrice) {
    updates.priceMinMYR = newPrice.min;
    updates.priceMaxMYR = newPrice.max;
    updates.avgPriceMYR = FieldValue.delete(); // replaced by the range
  }
  if (halalStr) {
    const answer = halalStr.toLowerCase();
    updates.isHalal = ["y", "yes"].includes(answer) ? "halal" : ["n", "no"].includes(answer) ? "non-halal" : "unknown";
  }

  if (Object.keys(updates).length === 0) {
    console.log("No changes made.");
    return;
  }

  await db.collection("venues").doc(target.id).update(updates);
  console.log(`\n✅ Successfully updated '${target.name}'!`);
}

async function handleDelete() {
  console.log("\n--- DELETE CAMPUS VENUE ---");
  const venues = await listVenues();
  if (venues.length === 0) {
    console.log("No venues to delete.");
    return;
  }

  venues.forEach((v, idx) => console.log(`  [${idx + 1}] ${v.name} (${v.id})`));
  const pickStr = await ask("\nEnter number to delete (or 'q' to cancel): ");
  if (pickStr.toLowerCase() === "q") return;

  const idx = parseInt(pickStr) - 1;
  const target = venues[idx];
  if (!target) {
    console.log("❌ Invalid selection.");
    return;
  }

  const confirm = await ask(`⚠️ Are you sure you want to delete '${target.name}'? (yes/no): `);
  if (confirm.toLowerCase() === "yes" || confirm.toLowerCase() === "y") {
    await db.collection("venues").doc(target.id).delete();
    console.log(`\n🗑️ Deleted venue: '${target.name}'`);
  } else {
    console.log("Cancelled deletion.");
  }
}

async function main() {
  console.log("\n========================================================");
  console.log("  🎓 STUDENT FOOD INTELLIGENCE - TERMINAL CLI MANAGER  ");
  console.log("========================================================");

  let running = true;
  while (running) {
    console.log("\nSelect an action:");
    console.log("  [1] View all venues & menus");
    console.log("  [2] Add a new venue");
    console.log("  [3] Edit a venue");
    console.log("  [4] Remove / Delete a venue");
    console.log("  [5] Exit");

    const choice = await ask("\nChoose an option (1-5): ");
    switch (choice) {
      case "1":
        await handleViewAll();
        break;
      case "2":
        await handleAdd();
        break;
      case "3":
        await handleEdit();
        break;
      case "4":
        await handleDelete();
        break;
      case "5":
      case "exit":
      case "quit":
      case "q":
        running = false;
        console.log("\n👋 Exiting CLI. Have a good meal!");
        break;
      default:
        console.log("❌ Invalid option. Please enter 1, 2, 3, 4, or 5.");
    }
  }

  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
