# makanApa

Campus dining matches for Universiti Malaya students. Pick a craving, a budget, a distance and any
diet needs, and the app suggests where to eat around UM, with a short reason for each pick and a
Google Maps link.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Firebase Firestore and Gemini.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

All of these go in `.env.local`, which is gitignored.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Firestore, which holds the `venues` collection (and group rooms). |
| `GROQ_API_KEY` | Reading the search box into keywords in `/api/decide` (spelling fixes, synonyms, areas). Server-side only. `GROQ_MODEL` optionally overrides the model (default `qwen/qwen3.8-27b`). |
| `GEMINI_API_KEY` | Group mode only (`/api/group/resolve`). Server-side only. |
| `GOOGLE_MAPS_API_KEY` | `npm run db:import-nearby` only. Needs Places API (New) enabled. |
| `NEXT_PUBLIC_ENABLE_GROUP` | Turns group mode on. See [Feature flags](#feature-flags). |

The app still works without `GROQ_API_KEY`. `/api/decide` then reads the search box in code (commas
split it, known area names and a few food aliases are recognised) and reports `engine: "fallback"`.
It does the same when Groq fails, takes over 4 s or returns nothing usable.

Groq's free tier allows 8,000 tokens a minute and 1,000 requests a day. Each new search text costs one
request of about 800 tokens, so roughly 10 new searches a minute; repeated ones come from a one-day cache.
After a 429, `/api/decide` stops calling Groq until its `retry-after` passes and uses code's reading meanwhile.

## How it works

- **`/`**: the home feed, with the top recommendations and a list of more matches.
- **`/filter`**: the filter sheet (craving, budget, distance, diet). Apply runs the search right away.
  Ticking a diet tag still filters the cached cards on the client instantly. Halal is one choice:
  Halal only, Non-halal only or Any.
- **`POST /api/decide`**: loads venues from Firestore plus a few hard-coded off-campus spots and reads
  the search box ("sec17, chinese, rice", "zus", "bakuteh") into areas and food groups. Groq does that
  reading (cached per search text for a day); it never sees venues, prices or diet data. Code then filters
  by budget, diet, straight-line distance from the UM campus centre (skipped when the search names an
  area), the named area, and the food groups, matched against each venue's name, cuisine, serves and
  menu. Google's summary counts only while a venue's serves is blank, and Google's tags never do (a
  "Vegetarian" tag only means Google saw one veg dish); "halal" and "vegetarian" in the search box match
  the sheet's checked diet answers. Venues matching more of the food groups rank first, then nearest,
  within budget, best rated and cheapest. A venue known to break a ticked diet filter is dropped. A venue nobody has checked
  (`unknown`) is kept, but only under See more with an "unconfirmed" label, after the confirmed ones; the
  top 3 are always confirmed. The page asks once with `skipAi` for instant results, then again for
  Groq's reading when there is a search text.

Code layout:

```
src/app/                  pages and API routes
src/components/           home/ (feed, filter sheet), group/ (group room), layout/ (bottom nav), ui/ (icons)
src/lib/                  shared logic: diet rules, filters, geo, maps links, Firebase, API client, venue photos
scripts/venues/           venue data tools (Places import, sheet export/import, terminal editor, photo list)
scripts/lib/              helpers shared by those scripts (Firestore connection, CSV)
scripts/smoke-test.mjs    end-to-end check of every page and API route
public/venues/            venue photos
data/places-cache/        raw Google Places results per area (gitignored)
venues.csv                the venue sheet written by db:export-sheet (gitignored)
```

The UI follows the design system in [DESIGN.md](DESIGN.md).

## Managing venue data

Venues live in the Firestore `venues` collection. Every script reads its keys from `.env.local`.

| Command | What it does |
| --- | --- |
| `npm run db:import-nearby` | Imports food places around UM from Google Places. Supports `--area=<um, bangsar, ss2, taman-paramount, sec17 or kl-gateway>` (kl-gateway is a mall, so it runs text searches inside the building instead of a grid), `--min-reviews=<n>`, `--dry-run`, `--extent=<metres>`, `--max-calls=<n>`, `--resume` and `--use-cache`. Safe to re-run: places are keyed by Google place ID and near-duplicates are skipped. |
| `npm run db:export-sheet` | Writes every venue to `venues.csv` so halal, diet flags, price, foods, cuisine and allergy notes can be filled in by hand. |
| `npm run db:import-sheet` | Reads the edited `venues.csv` back into Firestore. Use `--dry-run` first. Blank cells leave a field unchanged. `halal` is `halal`, `non-halal` or `unknown`; `vegetarian`, `vegan` and `noSeafood` are `yes`, `no` or `unknown` (the old `Y` / `N` still load). `serves` lists what the venue is known for ("bak kut teh, chicken rice"); search reads it. `cuisine` starts as Google's label; correct it here when Google is wrong, and Places imports leave it alone. |
| `npm run db:cli` | Interactive terminal tool to view, add, edit and delete venues. |

The usual loop is import nearby → export sheet → edit in Google Sheets or Excel → import sheet.
The Places project allows 100 nearby searches a day, so a large import may need `--resume` the
next day.

## Venue photos

Cards look for a JPEG in `public/venues/`, named after the venue's id, which is its Google Place ID (for example,
`ChIJlzIJRXpJzDERvkxxxoAitks.jpg`). In `npm run dev` every top-3 card has an **Upload photo** button
that resizes the picked JPG, PNG or WebP to 1024px wide and saves it there under the right name; the
button and its `/api/dev/venue-photo` route return 404 or do not render outside development. Commit
the new files with `git add public/venues`, then redeploy. Run `npm run venues:photos` for the list of
wanted filenames and what is still missing (`npm run venues:photos -- todo` lists only the gaps). It
reads `venues.csv`, so run `db:export-sheet` first. A venue with no photo falls back to a
cuisine-coloured tile, so the list can be worked through in any order. 16:9 crops look best.

`next.config.ts` only allows image optimisation for `/venues/**`. Add any other local image path
there before pointing `next/image` at it.

## Feature flags

Group mode (room codes, shared diet filters) is built but kept off the public site: the `/group`
page and every `/api/group/*` route return 404, and the Group nav tab is hidden. Set
`NEXT_PUBLIC_ENABLE_GROUP=true` in `.env.local` to turn all of it back on for local work. The flag
is read at build time, so a deploy without it ships no group route at all.

## Testing

With the dev server running:

```bash
node scripts/smoke-test.mjs                 # against http://localhost:3000
node scripts/smoke-test.mjs https://example # or any other base URL
```

It checks that every page and API route returns what it should. The group checks are skipped when
group mode is off. When it is on, they write a test room and two participants to Firestore.

Run `npm run lint` for ESLint and `npm run build` for a production build.
