# Objectives

What makanApa is for, who it serves and what it won't do. Check new work against this file. How the
app looks lives in [DESIGN.md](DESIGN.md); the terms are in [GLOSSARY.md](GLOSSARY.md).

## Purpose

makanApa tells a hungry Universiti Malaya student where to eat. They pick a craving, budget, area and
diet needs and get three top picks, each with a reason and a Maps link, plus a See more list.

The main moment: one student, a gap between lectures, no time to decide. Without makanApa they ask a
friend, scroll Google Maps or go to the usual place.

## Who it's for

- **UM students** eating anywhere around UM: on campus, SS2, Section 17 and around, and Bangsar. That
  covers both a quick meal between lectures and an evening trip out.
- **Students on a student budget.** Others can use it, but every decision is made for students.
- **Halal and non-halal students equally.** The data is split about evenly, and the Halal choice has
  three options. Don't tilt the app either way.

## Where makanApa beats Google Maps

Maps already lists everything nearby. makanApa is only worth opening if it wins on:

1. **Speed to a decision.** Three picks with a reason, not fifty pins.
2. **Diet answers you can trust.** Halal, vegetarian and other diet answers are checked by hand. An
   unchecked venue never becomes a top pick.

A feature that helps neither of these waits.

## Out of scope

- **No ordering or delivery.** makanApa sends you there with a Maps link.
- **No reviews or ratings of its own.** It uses Google's rating.
- **No live crowd levels or wait times.**
- **No accounts or login** for solo mode.
- **No AI choosing venues.** The AI only reads the search text; code filters and ranks.
- **No paid placement.** Venues can't pay to rank higher.

## Coverage

Coverage grows on purpose. Add a new area only once every venue in the current areas has its diet
answers checked, because every unchecked venue weakens the trust edge.

## Order of work

1. **Solo mode first.** It's the product.
2. **Group mode next**, where friends pick one place together. It's built and kept behind
   `NEXT_PUBLIC_ENABLE_GROUP`. Turn it on only when either:
   - **Solo mode is polished**:
     - every venue's halal answer is filled in;
     - a search shows picks in under about 2 seconds on a phone;
     - there are no known bugs in the main flow;
     - at least 5 students who aren't the developer have used it for a real meal and said what
       annoyed them.
   - **or solo mode has steady users**: about 20 students using it at least once a week, two weeks in
     a row.

## Planned changes

### Area chips instead of distance (next up, after the current UI/UX pass)

Replace the 1 / 3 / 5 km / Any distance picker with area chips. Students think in places ("SS2 or
Bangsar?"), and the km rings measure from the middle of campus, not from the student.

- Chips: **On campus** (default), **SS2**, **Section 17 & around**, **Bangsar**, plus **Anywhere**.
  More than one can be picked.
- Each venue's detailed `area` value maps to one chip through a lookup table, so the venue data doesn't
  change. Section 17 & around covers Sections 11–19, 51a, Sea Park, Taman Paramount, Jaya One,
  Damansara Jaya/Intan/Utama, PJS 11 and Taman Gembira. Bangsar covers Bangsar, Bangsar South and
  MAHSA Avenue.
- An area named in the search text ("sec17 chinese") should agree with the chips. Settle which one
  wins when they differ.
- Each new area added to coverage needs a chip.

## Current state (2 Nov 2026)

- Solo mode works end to end. As of the 11 Oct venue export: 623 venues, 20 halal answers still
  `unknown`.
- No one outside the developer has used it for a real meal yet.
- Group mode is built and switched off.
