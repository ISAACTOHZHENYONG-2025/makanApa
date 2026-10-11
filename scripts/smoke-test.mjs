// Smoke test for the pages and API routes. Start the app first (`npm run dev`), then:
//   node scripts/smoke-test.mjs [baseUrl]
// Note: the group steps write a test room and two participants to Firestore.

const BASE = process.argv[2] ?? "http://localhost:3000";
let failed = 0;

function report(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function page(path) {
  try {
    const res = await fetch(BASE + path);
    report(`GET ${path}`, res.status === 200, `status ${res.status}`);
  } catch (err) {
    report(`GET ${path}`, false, err.message);
  }
}

async function post(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: { error: err.message } };
  }
}

console.log(`Testing ${BASE}\n`);

try {
  await fetch(BASE);
} catch (err) {
  const cause = err.cause?.code ?? err.cause?.message ?? err.message;
  console.error(`Cannot reach ${BASE} (${cause}).`);
  console.error("Start the app with `npm run dev`, then pass its URL, e.g. node scripts/smoke-test.mjs http://127.0.0.1:3000");
  process.exit(2);
}

// Group mode is behind NEXT_PUBLIC_ENABLE_GROUP. With it off every group route 404s, so probe
// a request that would answer 400 when the feature is on and skip the group checks if it doesn't.
const groupProbe = await fetch(`${BASE}/api/group/members`);
const groupEnabled = groupProbe.status !== 404;
if (!groupEnabled) console.log("Group mode is off (NEXT_PUBLIC_ENABLE_GROUP) - skipping group checks.\n");

for (const path of groupEnabled ? ["/", "/group", "/filter"] : ["/", "/filter"]) await page(path);

// /api/decide
const decideCases = [
  { label: "within 3 km, any craving", craving: "", maxBudget: 15, maxDistanceKm: 3, dietaryRestrictions: ["Halal"] },
  { label: "within 1 km", craving: "", maxBudget: 15, maxDistanceKm: 1, dietaryRestrictions: ["Halal"] },
  { label: "any distance", craving: "", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: [] },
  { label: "vegetarian", craving: "", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: ["Vegetarian"] },
  { label: "vegetarian + no seafood", craving: "", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: ["Vegetarian", "No Seafood"] },
  { label: "noodles, RM10, halal", craving: "noodles", maxBudget: 10, maxDistanceKm: 3, dietaryRestrictions: ["Halal"] },
  { label: "accented craving", craving: "café", maxBudget: 30, maxDistanceKm: 3, dietaryRestrictions: [] },
  { label: "non-Latin craving", craving: "面", maxBudget: 30, maxDistanceKm: 3, dietaryRestrictions: [] },
  // Several things at once; a named area overrides the 1 km limit. skipAi checks code's own reading.
  { label: "area + foods, code", craving: "sec17, chinese, rice", maxBudget: 30, maxDistanceKm: 1, dietaryRestrictions: [], skipAi: true, expectAreas: ["Section 17"] },
  { label: "area + foods, AI", craving: "sec17, chinese, rice", maxBudget: 30, maxDistanceKm: 1, dietaryRestrictions: [], expectAreas: ["Section 17"] },
  { label: "phrase without commas, code", craving: "sec17 chinese rice", maxBudget: 30, maxDistanceKm: 1, dietaryRestrictions: [], skipAi: true, expectAreas: ["Section 17"] },
  { label: "area only, halal", craving: "ss2", maxBudget: 30, maxDistanceKm: 1, dietaryRestrictions: ["Halal"], skipAi: true, expectAreas: ["SS2"] },
  { label: "brand", craving: "zus", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: [], expectName: /zus/i },
  { label: "misspelt dish, AI", craving: "bakuteh", maxBudget: 40, maxDistanceKm: null, dietaryRestrictions: [], expectName: /bak kut teh|bah kut teh|肉骨茶/i },
  // A venue name the AI doesn't know: its reading must not replace code's, which finds the venue by name
  { label: "venue name the AI doesn't know", craving: "tanaair", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: [], expectName: /tanaair/i },
  // Filler words drop out of code's reading ("thai food" is "thai"); a known dish stays one phrase.
  { label: "filler words, code", craving: "vietnam cuisine", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: [], skipAi: true, expectLabels: ["vietnam"] },
  { label: "known dish, code", craving: "wantan mee", maxBudget: 30, maxDistanceKm: null, dietaryRestrictions: [], skipAi: true, expectLabels: ["wantan mee"] },
];
for (const { label, expectAreas, expectName, expectLabels, ...payload } of decideCases) {
  const { status, data } = await post("/api/decide", payload);
  const recs = data.recommendations;
  const more = data.moreMatches;
  const query = data.query;
  const tags = query ? [...query.areas, ...query.groups.map((g) => g.label)].join(", ") : "none";
  report(
    `POST /api/decide (${label})`,
    status === 200 && Array.isArray(recs) && Array.isArray(more),
    status === 200
      ? `${recs?.length ?? 0} top, ${more?.length ?? 0} more, engine ${data.engine}, read as [${tags}]`
      : `status ${status}: ${data.error ?? ""}`,
  );
  if (Array.isArray(recs) && Array.isArray(more)) {
    const all = [...recs, ...more];
    report(`  query echoed (${label})`, Array.isArray(query?.areas) && Array.isArray(query?.groups));
    report(`  top picks <= 3 (${label})`, recs.length <= 3);
    report(`  cheapest meal within RM${payload.maxBudget} (${label})`, all.every((r) => r.priceMinMYR <= r.priceMaxMYR && r.priceMinMYR <= payload.maxBudget));
    report(`  withinBudget matches price range (${label})`, all.every((r) => r.withinBudget === r.priceMaxMYR <= payload.maxBudget));
    report(`  all carry diet answers (${label})`, all.every((r) => r.diet && typeof r.diet === "object"));
    if (expectAreas) {
      report(`  read area ${expectAreas} (${label})`, expectAreas.every((a) => query?.areas.includes(a)));
      report(`  found some (${label})`, all.length > 0);
      report(`  all in ${expectAreas} (${label})`, all.every((r) => expectAreas.includes(r.area)));
    }
    // A dish can match through serves or the menu too, so only some top pick need carry it in the name
    if (expectName) report(`  a top pick named ${expectName} (${label})`, recs.some((r) => expectName.test(r.venueName)));
    if (expectLabels) {
      report(`  read as ${expectLabels} (${label})`, query?.groups.map((g) => g.label).join("|") === expectLabels.join("|"));
      report(`  found some (${label})`, all.length > 0);
    }
    if (payload.dietaryRestrictions.includes("Halal")) {
      report(`  top picks all halal (${label})`, recs.every((r) => r.isHalal));
    }
    // A named area overrides the distance limit
    if (payload.maxDistanceKm !== null && !query?.areas.length) {
      report(`  all within ${payload.maxDistanceKm} km (${label})`, all.every((r) => r.distanceMeters === undefined || r.distanceMeters <= payload.maxDistanceKm * 1000));
    }
    // A venue nobody has checked is kept, but only under See more: the top picks must be confirmed, and no
    // venue known to break a ticked filter may appear at all.
    if (payload.dietaryRestrictions.includes("Vegetarian")) {
      report(`  top picks all vegetarian (${label})`, recs.every((r) => r.isVegetarian));
      report(`  none known non-vegetarian (${label})`, all.every((r) => r.diet.vegetarian !== "no" || r.diet.vegan === "yes"));
    }
    if (payload.dietaryRestrictions.includes("No Seafood")) {
      report(`  top picks all seafood-free (${label})`, recs.every((r) => r.diet.noSeafoodOption === "yes"));
      report(`  none known to serve seafood (${label})`, all.every((r) => r.diet.noSeafoodOption !== "no"));
    }
    report(`  all have a Maps link (${label})`, all.every((r) => /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/.test(r.mapsUrl)));
  }
}

// /api/group/*
if (groupEnabled) {
  const created = await post("/api/group/create", { hostName: "SmokeTest Host" });
  const roomCode = created.data.roomCode;
  report(
    "POST /api/group/create",
    created.status === 200 && /^UM-[A-Z0-9]{3}$/.test(roomCode ?? ""),
    created.status === 200 ? roomCode : `status ${created.status}: ${created.data.error ?? ""}`,
  );

  if (roomCode) {
    const empty = await post("/api/group/resolve", { roomCode });
    report("POST /api/group/resolve (no members) -> 400", empty.status === 400, `status ${empty.status}`);

    const members = [
      { memberName: "Alex", maxBudget: 10, availableTimeMins: 30, transportMode: "walk_or_public", dietaryRestrictions: ["Halal"] },
      { memberName: "Sarah", maxBudget: 20, availableTimeMins: 45, transportMode: "private_vehicle", dietaryRestrictions: [] },
    ];
    for (const m of members) {
      const joined = await post("/api/group/join", { roomCode, ...m });
      report(`POST /api/group/join (${m.memberName})`, joined.status === 200 && joined.data.success === true, `status ${joined.status}`);
    }

    try {
      const res = await fetch(`${BASE}/api/group/members?roomCode=${roomCode}`);
      const room = await res.json();
      const names = (room.participants ?? []).map((p) => p.memberName).join(", ");
      report("GET /api/group/members (2 members)", res.status === 200 && room.participants?.length === 2, names);
    } catch (err) {
      report("GET /api/group/members", false, err.message);
    }

    const resolved = await post("/api/group/resolve", { roomCode });
    report("POST /api/group/resolve (2 members)", resolved.status === 200, `status ${resolved.status}: ${resolved.data.error ?? ""}`);
    if (resolved.status === 200) console.log("  response keys:", Object.keys(resolved.data).join(", "));
  }

  // error cases
  const unknownRoom = await fetch(`${BASE}/api/group/members?roomCode=UM-ZZZ`);
  report("GET /api/group/members (unknown room) -> 404", unknownRoom.status === 404, `status ${unknownRoom.status}`);
  report("GET /api/group/members (no roomCode) -> 400", groupProbe.status === 400, `status ${groupProbe.status}`);
  const noCode = await post("/api/group/join", { memberName: "X" });
  report("POST /api/group/join (no roomCode) -> 400", noCode.status === 400, `status ${noCode.status}`);
  const badCode = await post("/api/group/join", { roomCode: "UM-ZZZ" });
  report("POST /api/group/join (unknown room) -> 404", badCode.status === 404, `status ${badCode.status}`);
  const badResolve = await post("/api/group/resolve", {});
  report("POST /api/group/resolve (no roomCode) -> 400", badResolve.status === 400, `status ${badResolve.status}`);
}

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
