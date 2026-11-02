// Writes every Firestore venue to venues.csv so halal, price and food types can be filled in by hand.
//   npm run db:export-sheet
//   npm run db:export-sheet -- --file=my-venues.csv
// Edit the file in Google Sheets or Excel, save it as CSV, then run `npm run db:import-sheet`.

import * as fs from "fs";
import type { Venue } from "../../src/lib/types";
import { normalizeVenueDiet } from "../../src/lib/diet";
import { googleMapsUrl } from "../../src/lib/mapsLinks";
import { formatPriceRange, venuePriceRange } from "../../src/lib/price";
import { venueArea } from "../../src/lib/area";
import { BOM, SHEET_COLUMNS, sortByArea, toCsv } from "../lib/sheet-csv";
import { connectFirestore, runScript } from "../lib/firestore";

// "12-25"; blank when the venue has no price
function priceCell(v: Venue) {
  const price = venuePriceRange(v);
  return price ? formatPriceRange(price) : "";
}

const yesNo = (value: boolean | undefined) => (value === undefined ? "" : value ? "Y" : "N");
// halal, vegetarian, vegan and noSeafood are written as words; a venue nobody has checked says "unknown"
const word = (value: string | undefined) => value ?? "unknown";

runScript(async () => {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const file = fileArg ? fileArg.split("=")[1] : "venues.csv";

  const db = connectFirestore();
  const venues = sortByArea(
    (await db.collection("venues").get()).docs
      // Docs not re-imported since the three-word answers still hold true/false; read them as words
      .map((d) => normalizeVenueDiet({ ...(d.data() as Venue), id: d.id }))
      .map((v) => ({ ...v, area: venueArea(v.location) ?? "", distance: v.distanceMeters ?? Infinity })),
  );

  const rows = venues.map((v) => [
    v.id,
    v.name,
    v.area,
    word(v.isHalal),
    word(v.vegetarian),
    yesNo(v.hasVegetarianOptions),
    word(v.vegan),
    word(v.noSeafoodOption),
    yesNo(v.nonHalal),
    yesNo(v.noBeefOption),
    priceCell(v),
    // Empty for venues that haven't been filled in yet; kept on re-export so nothing is lost.
    (v.serves ?? []).join(", "),
    v.allergyNotes,
    v.cuisine,
    v.description,
    (v.services ?? []).join(", "),
    (v.openingHours ?? []).join("; "),
    v.rating,
    v.ratingCount,
    v.distanceMeters,
    v.location,
    v.mapsUrl ?? googleMapsUrl(v),
    v.researchNotes,
  ]);

  // The BOM makes Excel open the file as UTF-8 so names with accents survive.
  fs.writeFileSync(file, BOM + toCsv([[...SHEET_COLUMNS], ...rows]), "utf-8");
  console.log(`Wrote ${venues.length} venue(s) to ${file}.`);
  console.log("Fill in halal (halal / non-halal / unknown), vegetarian, vegan, noSeafood (yes / no / unknown), nonHalal, noBeef (Y/N), priceMYR (a range, e.g. 12-25), serves (e.g. \"rice, noodles\") and allergyNotes, then run: npm run db:import-sheet -- --dry-run");
});
