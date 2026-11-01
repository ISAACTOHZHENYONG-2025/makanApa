---
name: Campus Food Intelligence
colors:
  background: '#f8f9fa'
  primary: '#00b14f'
  primary-dark: '#009643'
  primary-ink: '#007a33'
  primary-fill: '#00873c'
  primary-fill-hover: '#006f31'
  primary-tint: '#e6f7ed'
  amber: '#ffb800'
  amber-ink: '#8a6100'
  amber-tint: '#fff8e1'
  flame: '#ff5722'
  flame-ink: '#b33a12'
  flame-tint: '#fbe9e7'
  hairline: '#e9ecef'
  hairline-strong: '#dee2e6'
  muted: '#6c757d'
  on-primary: '#ffffff'
  secondary: '#7c5800'
  secondary-container: '#ffcd71'
  surface: '#ffffff'
  on-surface: '#1e2329'
  on-surface-variant: '#495057'
  surface-container-low: '#f0f4fc'
  surface-container: '#f1f3f5'
  surface-container-high: '#e4e8f1'
  surface-container-lowest: '#ffffff'
  primary-fixed: '#9af7a7'
  secondary-fixed: '#ffdea7'
  on-secondary-fixed: '#271900'
  tertiary-fixed: '#ffdbd1'
  on-tertiary-fixed: '#3b0900'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  surface-container-highest: '#dee3eb'
  on-primary-fixed: '#002109'
  surface-variant: '#dee3eb'
  tertiary-container: '#b12f00'
  error: '#ba1a1a'
  on-error: '#ffffff'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style

makanApa helps Universiti Malaya students pick somewhere to eat between lectures: type a craving, set a budget, distance and diet, and get three top picks plus a longer See more list. Group rooms (behind `NEXT_PUBLIC_ENABLE_GROUP`) let friends pick one place together.

The look borrows from food-delivery apps: fast, legible and practical.
- Pure white cards on a soft grey canvas, so each region reads on its own.
- Clear diet badges, price and distance on every venue.
- Pill chips, segmented pickers and a budget slider, all usable with one thumb.

## Colors

- **Primary (`#00B14F`)**: delivery green, for open, available and positive states. Used for borders, decorative icons, the slider, the logo and tints only; never for text, and never behind white text.
- **Secondary (`#FFB800`)**: amber, for ratings, "cheaper meals within budget" and unconfirmed diet answers.
- **Tertiary (`#FF5722`)**: flame, for allergy notes and urgent warnings.
- **Neutral (`#1E2329`)**: dark slate for text, instead of pure black.

### Text and Fill Tokens
White or green text on `#00B14F` is about 2.8:1, below the 4.5:1 minimum for body text. So coloured text and white-text buttons use darker variants, and `#00B14F` itself stays for borders, icons and tints:

- **Green text**: `primary-ink` (`#007A33`).
- **White-text buttons and pills**: `primary-fill` (`#00873C`), hover and pressed `primary-fill-hover` (`#006F31`).
- **Light green background**: `primary-tint` (`#E6F7ED`).
- **Amber**: `amber` (`#FFB800`) for icons and borders; `amber-ink` (`#8A6100`) for text; `amber-tint` (`#FFF8E1`) for backgrounds.
- **Flame**: `flame` (`#FF5722`) for icons and borders; `flame-ink` (`#B33A12`) for allergy and urgent text; `flame-tint` (`#FBE9E7`) for backgrounds.
- **Borders**: `hairline` (`#E9ECEF`) for borders and dividers; `hairline-strong` (`#DEE2E6`) for input borders.
- **Helper text**: `muted` (`#6C757D`), on white only. On grey, small text uses `on-surface-variant` (`#495057`).

### Surfaces
- **Canvas**: `#F8F9FA`.
- **Cards**: `#FFFFFF`.
- **Subtle container**: `#F1F3F5` for pill tracks, inactive segmented options and input backings.

## Typography

Inter for everything.

- **Tabular figures**: prices, distances and counts use `tabular-nums`, so numbers don't shift when results refresh.
- **Headings**: negative letter spacing at large sizes. Sentence case everywhere ("Budget ceiling", not "Budget Ceiling").
- **Labels**: badges use uppercase or semi-bold (`label-sm`, `label-md`), e.g. "HALAL", "#1 MATCH".
- **Minimum sizes**: nothing is smaller than `label-sm` (11px), and 11px is for uppercase badges and labels only. Body and helper text is at least `body-sm` (12px).

## Layout & Spacing

The app is a phone layout on every screen: one column, capped at `420px` wide and centred, with a sticky header at the top and an optional sticky action bar at the bottom. There is no separate tablet or desktop layout.

### Sticky Bar Padding
While the sticky action bar is showing, the main scroll area has `pb-24` (96px) of bottom padding so the last card scrolls clear of the bar. When the bar is hidden, `pb-6` is enough.

### Spacing
- 4px: icon-to-label gaps, badge padding.
- 8px: gaps between chips and segmented options.
- 16px: card padding, space between form fields.
- 24px: sections inside the filter sheet.
- 32px: breaks between page sections.

## Elevation & Depth

Soft shadows plus 1px borders, so edges stay crisp in bright outdoor light.

- **Level 0**: canvas (`#F8F9FA`), no shadow.
- **Level 1 (card)**: white, `1px solid #E9ECEF`, shadow `0 2px 8px rgba(30, 35, 41, 0.04)`.
- **Level 2 (raised)**: shadow `0 6px 16px rgba(30, 35, 41, 0.08)`, border `#DEE2E6`. Defined but not used yet; for a raised or hovered card if one is needed.
- **Level 3 (overlay)**: shadow `0 10px 30px rgba(0, 0, 0, 0.10)`. For the filter sheet and the sticky bar.

## Shapes

- **Cards and the filter sheet**: `16px` corners (the sheet's top corners are rounder).
- **Buttons, chips and segmented pills**: fully rounded (`9999px`).
- **Inputs**: `12px`.
- **Badges**: `6px`.

## Touch Targets

Icon-only buttons (clear, close, remove filter) are at least `44px`, or reach 44px with an invisible hit area. Picker options in the filter sheet are `44px` tall. Chips are `36px` tall, which passes WCAG's 24px minimum; keep chips that sit side by side apart so a thumb can't hit the wrong one.

## Filtering and Search

1. **Instant client-side filtering**: ticking a diet filter hides venues that break it straight away, with no new request. Unticking one, or changing the craving, budget or distance, runs a new search.
2. **AI only reads the search text**: "Show results" calls `/api/decide`. Code's own reading of the search text shows results at once; the AI's reading (areas, dishes, brands, spelling fixes) then refines them. The AI never sees venues; code does all filtering and ranking (`src/lib/feed.ts` arranges top picks and See more).

## Components

### Buttons
- **Primary**: `primary-fill` background, white `14px` bold text, pill, `48px` tall. Hover and pressed `primary-fill-hover`.
- **Secondary / outline**: transparent, `1.5px` border in `#00B14F`, `primary-ink` text, pill.
- **Ghost**: transparent, neutral text, hover fill `#F1F3F5`.
- "Show results" in the filter sheet runs the search straight away; there is no separate "apply" step.

### Sticky Action Bar
- Fixed to the bottom of the screen, `16px` above the bottom nav when there is one, Level 3 shadow.
- Full width minus `32px` (`w-[calc(100%-2rem)]`), `52px` tall, with the Material `bolt` icon on the left and an optional badge on the right.
- Shows only when it says something the header doesn't: "Finding meals…" (disabled) while a search runs, and "Try again" after an error. Hidden while results are showing; the result count sits beside the "Top picks" heading.

### Chips & Filter Pills
- Inactive: white, `1px solid #E9ECEF`, `#1E2329` text, pill, `36px` tall.
- Active: `primary-tint` background, `1.5px solid #00B14F` border, `primary-ink` bold text. Header chips for diet filters carry a remove cross.

### Venue Cards
- Base: `16px` corners, white, `1px solid #E9ECEF`.
- Top: a 16:9 photo, or a coloured tile with the venue's initial, with a distance badge and a "#1 MATCH" badge.
- Below: name with diet badges, price range with a budget note, one line each for area and distance and for what it serves, the "Why this pick" box, an allergy note when there is one, and a Directions button. Keep cards short enough that a phone shows most of one pick at a time.

### Segmented Controls
- Container: `#F1F3F5`, pill, `4px` padding.
- Options: `label-md`, `on-surface-variant`. The selected option is a white pill with Level 1 shadow and `#1E2329` text.
- Used for the Halal choice: Halal only · Non-halal only · Any.

### Budget Slider
- The native range input, coloured with `accent-primary`, with the current value shown in a pill beside the label (e.g. "RM15 (Standard)").

### Badges
- **Diet badges**: `primary-tint` with `primary-ink` text; filters nobody has confirmed for a venue use `amber-tint` with `amber-ink` (e.g. "HALAL UNCONFIRMED"). `6px` corners, uppercase `label-sm`.

### Inputs & Search
- `48px` tall, white, `1px solid #DEE2E6`, `12px` corners.
- Focus: border `#00B14F` with a soft ring `0 0 0 3px rgba(0, 177, 79, 0.15)`. Search fields have a magnifying-glass icon on the left and a clear button on the right.
- The sticky header has a search bar on the same row as the logo; tapping it opens the filter sheet with the craving box focused. Keeping them on one row leaves more of the screen for results.
