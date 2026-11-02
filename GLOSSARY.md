# Glossary

**Feed**: what one search shows: the top picks, then See more. Worked out from the venues that fit the search's budget, distance and craving and aren't known to break its diet filters, ranked. Lives in `src/lib/feed.ts`.

**Top pick**: one of the (at most) three venues the Feed shows first, each with a "Why this pick" reason. Only confirmed venues become top picks, and at most one branch per chain.

**See more**: every other venue in the Feed, confirmed ones first in ranked order, then unconfirmed ones.

**Unconfirmed**: a venue nobody has checked for a ticked diet filter (its sheet answer is blank or "unknown"). It stays in the Feed, labelled (e.g. "Halal unconfirmed"), but only ever in See more. A venue known to break a ticked filter is not in the Feed at all.

**Chain**: venues whose names start with one of the known chains in `src/lib/chains.ts` ("KFC Gateway Mall", "KFC Jalan Universiti DT"). Any other venue is a chain of one.
