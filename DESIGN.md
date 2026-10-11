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

The design system is engineered for real-time campus dining intelligence, crowd prediction, micro-vendor discovery, and group food logistics. Designed to merge the high-utility speed of premier on-demand delivery interfaces with actionable institutional analytics, the aesthetic is energetic, hyper-legible, and pragmatic.

The system targets university students, faculty, and dining hall administrators navigating rapid meal windows between lectures. The emotional tone must evoke speed, fresh sustenance, and frictionless coordination. 

The stylistic framework blends **Modern Utilitarian Delivery Design** with **Clean Editorial Data Presentation**:
- Pure, bright white layered over soft background slates to establish distinct, breathable content regions.
- High-visibility status cues, dietary flags, and peak-hour heat indicators.
- Precision controls: snappy segmented pickers, tactile numeric steppers, and granular dynamic filtering chips.
- Micro-interactions designed for single-thumb mobile operation that scale effortlessly to multi-column desktop dashboards.

## Colors

The palette leverages an energetic, appetite-stimulating spectrum anchored by a recognizable delivery green and sunny nutritional accents:

- **Primary (`#00B14F`)**: Delivery Emerald Green. Represents active orders, direct calls-to-action, available stalls, open dining halls, and positive capacity states. Used for borders, decorative icons, the slider, the logo and tints only; never for text, and never behind white text.
- **Secondary (`#FFB800`)**: Warm Amber. Indicates high demand, ratings, peak crowding warnings, dietary highlight tags, and curated student recommendations.
- **Tertiary (`#FF5722`)**: Warm Flame Red-Orange. Reserved for urgent campus dining notices, closing-soon alerts, sold-out statuses, and flash group orders.
- **Neutral (`#1E2329`)**: Deep Obsidian Slate. Delivers crisp contrast across typographic hierarchies against high-key backgrounds, avoiding sterile pure blacks.

### Text and Fill Tokens
White or green text on `#00B14F` is about 2.8:1, below the 4.5:1 minimum for body text. So coloured text and white-text buttons use darker variants, and `#00B14F` itself stays for borders, icons and tints:

- **Green text**: `primary-ink` (`#007A33`).
- **White-text buttons and pills**: `primary-fill` (`#00873C`), hover and pressed `primary-fill-hover` (`#006F31`).
- **Light green background**: `primary-tint` (`#E6F7ED`).
- **Amber**: `amber` (`#FFB800`) for icons and borders; `amber-ink` (`#8A6100`) for text; `amber-tint` (`#FFF8E1`) for backgrounds.
- **Flame**: `flame` (`#FF5722`) for icons and borders; `flame-ink` (`#B33A12`) for allergy and urgent text; `flame-tint` (`#FBE9E7`) for backgrounds.
- **Borders**: `hairline` (`#E9ECEF`) for borders and dividers; `hairline-strong` (`#DEE2E6`) for input borders.
- **Helper text**: `muted` (`#6C757D`), on white only. On grey, small text uses `on-surface-variant` (`#495057`).

### Surface Tones & Backgrounds
- **Canvas Base**: `#F8F9FA` serves as the primary canvas, providing a crisp, glare-free background across all screen widths.
- **Card & Surface Base**: `#FFFFFF` pure white, creating distinct contrast against `#F8F9FA`.
- **Subtle Surface Container**: `#F1F3F5` for pill tracks, inactive segmented controls, and input backings.
- **Dividers & Hairlines**: `#E9ECEF` for clean 1px spatial boundaries without visual weight.

## Typography

The typography uses Inter across all roles to ensure maximum readability, dense data rendering, and optical clarity at miniature mobile sizes.

- **Tabular Figures**: For pricing, wait-time countdowns, distance markers, and nutrition counts, always activate tabular lining numbers (`font-variant-numeric: tabular-nums`) to prevent jitter during real-time data refreshes.
- **Tight Headings**: Large sizes leverage negative letter spacing to feel punchy and compact, reflecting on-the-go speed.
- **Label Roles**: Micro-labels (`label-sm`, `label-md`) strictly utilize uppercase or semi-bold weights for badges (e.g., "HALAL", "10-15 MIN", "LOW CROWD").
- **Minimum Sizes**: Nothing is smaller than `label-sm` (11px), and 11px is for uppercase badges and labels only. Body and helper text is at least `body-sm` (12px).

## Layout & Spacing

The layout architecture employs a responsive fluid grid that prioritizes single-column, bottom-anchored mobile interaction while gracefully scaling into an expansive 12-column desktop command dashboard.

### Form Factor Behavior
- **Mobile (< 768px)**: 4-column fluid layout with `1rem` margins and gutters. Sticky top contextual search with horizontal chip filtering. Bottom navigation dock or sticky cart/action bar fixed to the viewport base.
- **Tablet (768px - 1023px)**: 8-column layout with `1.5rem` margins. Two-column card arrangements for stalls and meal categories.
- **Desktop (>= 1024px)**: 12-column containerized layout capped at a maximum width of `1280px`. Left rail for campus hub filters and navigation (3 columns), central feed for vendor cards and wait-time live charts (6 columns), and right sticky panel for order batching, queue status, and nutrition summaries (3 columns).

### Viewport Padding & Sticky Overlay Rules
- **Scroll Container Bottom Inset**: The main scroll container on mobile must apply a bottom padding of `pb-24` (`6rem` / `96px`) to ensure the lowest card (e.g., card #3) scrolls completely past the floating sticky "Find My Optimal Meal" bar without visual obscuration or cut-offs.

### Spacing Usage
- `space-xs` (4px): Metric gaps, chip icon-to-label spacing, badge interior padding.
- `space-sm` (8px): Gaps between segmented items, input text internal padding, small list items.
- `space-md` (16px): Standard internal card padding, standard vertical rhythm between adjacent form fields.
- `space-lg` (24px): Card section dividers, modal body padding.
- `space-xl` (32px): Primary section breaks within feeds and dashboards.

## Elevation & Depth

Visual depth is achieved through ultra-soft ambient drop shadows coupled with 1px border outlines to maintain structural crispness on bright screens under varying outdoor campus lighting.

- **Level 0 (Flat)**: Background canvas (`#F8F9FA`). No elevation.
- **Level 1 (Card Rest)**: Pure white `#FFFFFF` surface accompanied by a hairline border `1px solid #E9ECEF` and an ambient shadow `0 2px 8px rgba(30, 35, 41, 0.04)`. Used for vendor listings, analytics tiles, and menu items.
- **Level 2 (Hover / Elevated Card)**: `0 6px 16px rgba(30, 35, 41, 0.08)` with hairline border shifting to `#DEE2E6`. Applied to active menu items, hovered interactive analytics cards, and segmented control thumbs.
- **Level 3 (Sticky Nav / Overlays / Bottom Sheets)**: `0 10px 30px rgba(0, 0, 0, 0.10)`. Used for bottom navigation sheets, mobile fixed order drawers, and desktop filter dropdowns.

## Shapes

The interface embraces a friendly, ergonomic `16px` (`rounded-lg` / `1rem`) corner radius for all core content cards, balancing the visual comfort of mobile delivery apps with precise data alignment.

- **Cards & Modal Containers**: Exactly `16px` (`1rem`) to create smooth framing around food photography and analytical graphs.
- **Buttons & Filter Chips**: Fully rounded pill shapes (`9999px`) for touch targets, chips, and segmented pills, offering instant affordance for mobile tapping.
- **Input Fields & Steppers**: `12px` (`0.75rem`) for form inputs, providing crisp distinction from pill-shaped action buttons.
- **Badges & Tiny Tags**: `6px` (`0.375rem`) for compact corner overlays on food images and metric markers.

## Interaction Architecture & Execution Logic

### Hybrid Filtering Strategy (Client-Side Instant vs. Server-Side AI)
To balance zero-latency UI feedback with optimal API token usage and cost efficiency:
1. **Instant Client-Side Filtering**: Toggling static boolean flags (e.g., `Walk/Bus` vs. `Vehicle` or `Halal`) immediately hides non-matching cached cards locally via React client state without triggering backend API calls.
2. **Explicit AI Execution Trigger**: "Show results" in the filter sheet runs the `/api/decide` Next.js endpoint straight away; ticking a diet tag still filters instantly on the client. Results from code's own reading of the search text show immediately; the AI's reading of the search text (areas, dishes, brands, spelling fixes) then refines them. The AI only interprets the search text; code does all filtering and ranking.

## Components

### Buttons
- **Primary Action (Default / Active)**: Emerald fill (`#00873C`, `primary-fill`), white text (`#FFFFFF`), `14px` bold, pill shape (`9999px`), `48px` height on mobile for touch accessibility. Hover/active shifts to `#006F31`.
- **Primary Action (One-Tap Flow)**: There is no stale state. Once results are showing, the sticky bar reads "Refine search" and opens the filter sheet, where "Show results" runs the search.
- **Secondary / Outline**: Transparent background, `1.5px` border in `#00B14F`, text in `primary-ink` (`#007A33`), pill shape.
- **Ghost Action**: Transparent background with neutral text (`#1E2329`), subtle hover fill `#F1F3F5`.

### Floating Sticky Action Bar
- **Positioning**: Fixed to viewport bottom, `16px` above bottom navigation dock, wrapped in Level 3 elevation.
- **Dimensions**: Full-width minus `32px` mobile horizontal margins (`w-[calc(100%-2rem)]`), height `52px`.
- **Layout**: Contains primary CTA label, left-aligned action icon (the Material `bolt` icon), and right-aligned match count badge (`3 Options`).

### Chips & Filter Pills
- Inactive: Background `#FFFFFF`, border `1px solid #E9ECEF`, text `#1E2329`, pill-shaped, height `36px`.
- Active: Background `#E6F7ED` (emerald tint), border `1.5px solid #00B14F`, text `primary-ink` (`#007A33`), bold weight. Includes an optional trailing dismiss icon.

### Cards
- Base Card: `16px` border-radius, pure white background, `1px solid #E9ECEF`, `16px` internal padding.
- Food Vendor Card: Top half holds a 16:9 ratio food visual with embedded tag badges (e.g., "12 min prep", "Halal certified"). Bottom half contains stall name (`headline-sm`), distance/building tag, rating with a `#FFB800` star, and real-time wait tracker bar.

### Segmented Controls
- Container: Background `#F1F3F5`, pill shape, `4px` internal padding.
- Item: Text `label-md`, color `on-surface-variant` (`#495057`). Active item has pure white `#FFFFFF` pill background with Level 1 elevation and `#1E2329` text.
- Used for the Halal choice: Halal only · Non-halal only · Any.

### Interactive Sliders (Wait Time & Distance Filters)
- Track: Height `6px`, background `#E9ECEF`, filled progress segment in `#00B14F`.
- Thumb: `24px` circular pure white `#FFFFFF` knob with a `2px solid #00B14F` rim and subtle drop shadow. Displays a dynamic floating tooltip showing values (e.g., "Max 15 min").

### Badges & Clean Tags
- **Crowd Indicator Badge**: Green (`primary-tint` / `primary-ink`) for Low, Amber (`amber-tint` / `amber-ink`) for Medium, Flame (`flame-tint` / `flame-ink`) for High. Text always uses the -ink tokens.
- **Nutrition/Dietary Tags**: Light green backing (`primary-tint`) with `primary-ink` text; tags nobody has confirmed use `amber-tint` with `amber-ink`. `6px` radius, uppercase `label-sm`.

### Form Inputs & Search Fields
- Height `48px`, background `#FFFFFF`, border `1px solid #DEE2E6`, radius `12px`.
- Focus state: Border shifts to `#00B14F` with a soft outer ring `0 0 0 3px rgba(0, 177, 79, 0.15)`. Search fields integrate a leading magnifying icon and trailing clear button.
- The sticky header has a search bar that opens the filter sheet with the craving box focused.
