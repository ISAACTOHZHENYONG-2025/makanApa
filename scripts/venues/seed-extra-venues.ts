// Writes the app's built-in off-campus venues (src/lib/decide/seedVenues.ts) into Firestore, so they can be edited
// in the venues sheet like any other venue. The app skips a built-in venue once Firestore has one with the same
// placeId, so running this changes nothing for students.
//   npm run db:seed-extra -- --dry-run   # show what would be written, write nothing
//   npm run db:seed-extra                # write them (doc id = Google Place ID; existing docs are left alone)

import { doc, getDoc, setDoc } from "firebase/firestore";
import { OFF_CAMPUS_DRIVING_HOTSPOTS } from "../../src/lib/decide/seedVenues";
import { connectFirestore, runScript } from "../lib/firestore";

runScript(async () => {
  const dryRun = process.argv.includes("--dry-run");
  const db = connectFirestore();
  for (const venue of OFF_CAMPUS_DRIVING_HOTSPOTS) {
    if (!venue.placeId) continue;
    const ref = doc(db, "venues", venue.placeId);
    if ((await getDoc(ref)).exists()) {
      console.log(`skip   ${venue.name} (already in Firestore)`);
      continue;
    }
    console.log(`${dryRun ? "would add" : "add"}  ${venue.name}`);
    if (!dryRun) await setDoc(ref, { ...venue, source: "built-in", createdAt: new Date().toISOString() });
  }
});
