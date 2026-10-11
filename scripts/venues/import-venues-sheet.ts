// Reads venues.csv (from db:export-sheet) and updates each venue's halal, diet flags, price range, food types, cuisine, allergy notes and research notes by id.
// cuisine starts as Google's label; correct it here when Google is wrong (a Chinese mixed-rice shop called "Korean Restaurant"). Search reads it.
// halal is halal / non-halal / unknown; vegetarian, vegan and noSeafood are yes / no / unknown. The old Y / N still load (Y = halal or yes).
// priceMYR holds a range like "12-25"; a single "15" sets min and max to 15.
//   npm run db:import-sheet -- --dry-run   # show what would change, write nothing
//   npm run db:import-sheet                # write the changes to Firestore
//   npm run db:import-sheet -- --file=my-venues.csv
// Blank cells leave that field as it is (a venue with no answer already counts as unknown). Rows with bad values are skipped.

import * as fs from "fs";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeVenueDiet } from "../../src/lib/diet";
import type { DietAnswer, HalalStatus, Venue } from "../../src/lib/types";
import { formatPriceRange, parsePriceRange, venuePriceRange } from "../../src/lib/price";
import { parseCsv } from "../lib/sheet-csv";
import { connectFirestore, runScript } from "../lib/firestore";

const MAX_PRICE_MYR = 200;
const PLACEHOLDER_MENU_ITEM = "Typical meal";

type Update = Partial<
  Pick<
    Venue,
    | "isHalal"
    | "vegetarian"
    | "vegan"
    | "noSeafoodOption"
    | "nonHalal"
    | "noBeefOption"
    | "allergyNotes"
    | "researchNotes"
    | "priceMinMYR"
    | "priceMaxMYR"
    | "serves"
    | "menuItems"
    | "cuisine"
  >
> & { avgPriceMYR?: FieldValue };

const MAX_ALLERGY_NOTE_LENGTH = 200;
const MAX_RESEARCH_NOTE_LENGTH = 1000;
const MAX_CUISINE_LENGTH = 60;

function parseYesNo(column: string, value: string): boolean | undefined | Error {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (["y", "yes", "true", "1"].includes(v)) return true;
  if (["n", "no", "false", "0"].includes(v)) return false;
  return new Error(`${column} must be Y or N, got "${value}"`);
}

const isUnknown = (v: string) => ["unknown", "?"].includes(v);

// yes / no / unknown; the old Y / N still work
function parseAnswer(column: string, value: string): DietAnswer | undefined | Error {
  const v = value.trim().toLowerCase();
  if (isUnknown(v)) return "unknown";
  const yesNo = parseYesNo(column, value);
  if (yesNo instanceof Error) return new Error(`${column} must be yes, no or unknown, got "${value}"`);
  return yesNo === undefined ? undefined : yesNo ? "yes" : "no";
}

// halal / non-halal / unknown; the old Y (halal) and N (non-halal) still work
function parseHalal(value: string): HalalStatus | undefined | Error {
  const v = value.trim().toLowerCase();
  if (isUnknown(v)) return "unknown";
  if (["halal", "y", "yes", "true", "1"].includes(v)) return "halal";
  if (["non-halal", "non halal", "nonhalal", "n", "no", "false", "0"].includes(v)) return "non-halal";
  return v ? new Error(`halal must be halal, non-halal or unknown, got "${value}"`) : undefined;
}

// A cell differs from the stored value unless both mean the same: an unset field is "unknown".
// Compared with the raw stored value, so a doc still holding true/false gets rewritten as a word.
const differs = (cell: string, stored: string | undefined) => (stored === undefined ? cell !== "unknown" : cell !== stored);

function parseNote(column: string, value: string, maxLength: number): string | undefined | Error {
  const note = value.trim().replace(/\s+/g, " ");
  if (note.length > maxLength) return new Error(`${column} is over ${maxLength} characters`);
  return note || undefined;
}

function parseServes(value: string): string[] | undefined {
  const items = value
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return items.length > 0 ? [...new Set(items)] : undefined;
}

const sameList = (a: string[] = [], b: string[] = []) => a.join("|") === b.join("|");

runScript(async () => {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const file = fileArg ? fileArg.split("=")[1] : "venues.csv";
  if (!fs.existsSync(file)) {
    console.error(`${file} not found. Run npm run db:export-sheet first.`);
    process.exit(1);
  }

  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf-8"));
  const col = Object.fromEntries((header ?? []).map((name, i) => [name.trim().toLowerCase(), i]));
  for (const required of ["id", "halal", "vegetarian", "vegan", "noseafood", "pricemyr", "serves", "allergynotes"]) {
    if (col[required] === undefined) {
      console.error(`${file} is missing the "${required}" column. Expected the columns from db:export-sheet.`);
      process.exit(1);
    }
  }

  const db = connectFirestore();
  const venues = new Map(
    (await db.collection("venues").get()).docs.map((d) => [d.id, d.data() as Venue]),
  );

  const updates: { id: string; name: string; data: Update }[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const line = index + 2; // header is line 1
    const cell = (name: string) => row[col[name]] ?? "";
    const id = cell("id").trim();
    const venue = venues.get(id);
    const label = `Line ${line} (${cell("name") || id || "no id"})`;

    if (!venue) {
      console.log(`SKIP  ${label}: no venue with id "${id}"`);
      skipped++;
      return;
    }
    const halal = parseHalal(cell("halal"));
    const vegetarian = parseAnswer("vegetarian", cell("vegetarian"));
    const vegan = parseAnswer("vegan", cell("vegan"));
    const noSeafood = parseAnswer("noSeafood", cell("noseafood"));
    // Optional columns: sheets exported before they existed leave these flags alone.
    const nonHalal = parseYesNo("nonHalal", cell("nonhalal"));
    const noBeef = parseYesNo("noBeef", cell("nobeef"));
    const note = parseNote("allergyNotes", cell("allergynotes"), MAX_ALLERGY_NOTE_LENGTH);
    // Optional column: sheets exported before it existed leave research notes alone.
    const research = parseNote("researchNotes", cell("researchnotes"), MAX_RESEARCH_NOTE_LENGTH);
    // Optional column: sheets exported before it was editable still carry Google's label, so nothing changes.
    const cuisine = parseNote("cuisine", cell("cuisine"), MAX_CUISINE_LENGTH);
    const price = parsePriceRange(cell("pricemyr"), MAX_PRICE_MYR);
    const problems = [halal, vegetarian, vegan, noSeafood, nonHalal, noBeef, note, research, cuisine, price].filter(
      (v): v is Error => v instanceof Error,
    );
    if (problems.length > 0) {
      console.log(`SKIP  ${label}: ${problems.map((p) => p.message).join("; ")}`);
      skipped++;
      return;
    }

    const serves = parseServes(cell("serves"));
    const data: Update = {};
    const changes: string[] = [];

    // What the app reads: docs not re-imported yet may still hold true/false
    const current = normalizeVenueDiet(venue);
    if (typeof halal === "string" && differs(halal, venue.isHalal)) {
      data.isHalal = halal;
      changes.push(`halal ${current.isHalal ?? "unknown"} -> ${halal}`);
    }
    const answers = [
      ["vegetarian", "vegetarian", vegetarian],
      ["vegan", "vegan", vegan],
      ["noSeafood", "noSeafoodOption", noSeafood],
    ] as const;
    for (const [label, field, value] of answers) {
      if (typeof value === "string" && differs(value, venue[field])) {
        data[field] = value;
        changes.push(`${label} ${current[field] ?? "unknown"} -> ${value}`);
      }
    }
    const flags = [
      ["nonHalal", "nonHalal", nonHalal],
      ["noBeef", "noBeefOption", noBeef],
    ] as const;
    for (const [label, field, value] of flags) {
      if (typeof value === "boolean" && value !== venue[field]) {
        data[field] = value;
        const was = venue[field] === undefined ? "blank" : venue[field] ? "Y" : "N";
        changes.push(`${label} ${was} -> ${value ? "Y" : "N"}`);
      }
    }
    if (typeof note === "string" && note !== venue.allergyNotes) {
      data.allergyNotes = note;
      changes.push(`allergyNotes "${venue.allergyNotes ?? ""}" -> "${note}"`);
    }
    if (typeof research === "string" && research !== venue.researchNotes) {
      data.researchNotes = research;
      changes.push(venue.researchNotes ? "researchNotes edited" : "researchNotes added");
    }
    if (typeof cuisine === "string" && cuisine !== venue.cuisine) {
      data.cuisine = cuisine;
      changes.push(`cuisine "${venue.cuisine ?? ""}" -> "${cuisine}"`);
    }
    if (price && !(price instanceof Error) && (price.min !== venue.priceMinMYR || price.max !== venue.priceMaxMYR || venue.avgPriceMYR !== undefined)) {
      data.priceMinMYR = price.min;
      data.priceMaxMYR = price.max;
      // The old single price is replaced by the range
      if (venue.avgPriceMYR !== undefined) data.avgPriceMYR = FieldValue.delete();
      const was = venuePriceRange(venue);
      changes.push(`price ${was ? `RM${formatPriceRange(was)}` : "blank"} -> RM${formatPriceRange(price)}`);
      // Imported venues carry one placeholder menu item; keep it at the cheapest usual meal.
      if (venue.menuItems?.length === 1 && venue.menuItems[0].itemName === PLACEHOLDER_MENU_ITEM) {
        data.menuItems = [{ itemName: PLACEHOLDER_MENU_ITEM, priceMYR: price.min }];
      }
    }
    if (serves && !sameList(serves, venue.serves)) {
      data.serves = serves;
      changes.push(`serves [${(venue.serves ?? []).join(", ")}] -> [${serves.join(", ")}]`);
    }

    if (changes.length > 0) {
      updates.push({ id, name: venue.name, data });
      console.log(`EDIT  ${venue.name}: ${changes.join("; ")}`);
    }
  });

  console.log(`\n${rows.length} row(s): ${updates.length} to update, ${skipped} skipped, ${rows.length - updates.length - skipped} unchanged.`);

  if (dryRun) {
    console.log("Dry run: nothing written.");
    return;
  }
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 400)) batch.update(db.collection("venues").doc(u.id), u.data);
    await batch.commit();
  }
  if (updates.length > 0) console.log(`Updated ${updates.length} venue(s) in Firestore.`);
});
