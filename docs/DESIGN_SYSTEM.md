# Design System — JournalX Enterprise UI/UX Specification

Generated and synthesized using `.agents/skills/ui-ux-pro-max/`, `.agents/skills/ui-styling/`, and `.agents/skills/web-design-guidelines/`.

## 1. Visual Direction & Principles

- **Product Personality**: Precision-engineered personal operating system inspired by the clarity of Linear, Stripe Dashboard, Vercel Dashboard, and Notion — clean surfaces, high information density without clutter, strict typographic hierarchy, and zero ornamental noise.
- **No Anti-Patterns**: No generic purple gradients, no floating emojis used as icons (Lucide SVG icons only), no glassmorphism blur spam, no truncated cards, no misleading decorative metrics.

## 2. Typography

- **Primary Sans (`--font-sans`)**: `Plus Jakarta Sans` (weights `400`, `500`, `600`, `700`), optimized for legible dashboards and mobile scaling.
- **Monospace (`--font-mono`)**: `JetBrains Mono` (weights `400`, `500`, `600`), used for formulas, numeric metrics, IDs, keyboard shortcuts (`⌘K`), and timestamps.
- **Numeric Precision**: All KPI figures, table numeric columns, timers, and chart axes enforce `font-variant-numeric: tabular-nums`.
- **Headings**: `text-wrap: balance` with semantic hierarchy (`h1` -> `h2` -> `h3`).

## 3. Color Tokens (Light & Dark Themes)

| Semantic Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--background` | `#F8FAFC` | `#090D16` | Page canvas |
| `--foreground` | `#0F172A` | `#F8FAFC` | Primary ink (>= 4.5:1 contrast) |
| `--card` | `#FFFFFF` | `#111827` | Elevated workspace cards & panels |
| `--card-foreground` | `#0F172A` | `#F8FAFC` | Card ink |
| `--muted` | `#F1F5F9` | `#1E293B` | Secondary surfaces & subtle pills |
| `--muted-foreground` | `#475569` | `#94A3B8` | Metadata, helper text, secondary labels |
| `--primary` | `#1E40AF` | `#3B82F6` | Primary actions & active navigation |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on primary buttons |
| `--accent` | `#D97706` | `#F59E0B` | Highlights & warning/focus cues |
| `--border` | `#E2E8F0` | `#1E293B` | Crisp 1px structural dividers |
| `--destructive` | `#DC2626` | `#EF4444` | Destructive actions & errors |
| `--success` | `#15803D` | `#22C55E` | Positive completion & financial gains |
| `--ring` | `#1E40AF` | `#60A5FA` | Keyboard focus indicator (`focus-visible`) |

- **Chart Palette (Colorblind-Accessible)**: `#2563EB` (Cobalt), `#0D9488` (Teal), `#D97706` (Amber), `#7C3AED` (Violet), `#E11D48` (Rose), `#0284C7` (Sky) — paired with distinct line dash patterns, direct labels, and a toggleable accessible tabular view.

## 4. Spacing, Radii & Elevation

- **Spacing Scale**: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Border Radius**: `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 12px` (clean architectural corners; avoids overly bubbly pill cards).
- **Elevation**: Border-first separation (`1px solid var(--border)`) in both light and dark modes, with subtle shadow only on popovers, dialogs, and dragged surfaces.

## 5. Responsive Breakpoints & Mobile Architecture

- **Tested Breakpoints**: `360px`, `390px`, `430px` (Mobile), `768px` (Tablet), `1024px` (Compact Desktop), `1440px`, `1920px` (Wide Desktop).
- **Desktop Shell**: Collapsible left navigation rail (`260px` expanded / `68px` collapsed), contextual top header with breadcrumbs, global search trigger (`⌘K` / `Ctrl+K`), Quick Create button, Notification Center popover, Running Timer pill, and Profile menu.
- **Mobile Shell (`< 768px`)**:
  - Top contextual bar with menu/search & active timer indicator.
  - Persistent 5-slot **Bottom Navigation Bar** (`Home`, `Topics`, `Quick Create`, `Activity`, `Profile`) respecting `env(safe-area-inset-bottom)`.
  - Minimum `44px × 44px` touch targets on all interactive controls (`touch-action: manipulation`).
  - Bottom sheets / full-screen mobile editors for Topic Builder, Task Editor, Calculator Inputs, and Filters.

## 6. Accessibility & Application States (WCAG 2.2 AA)

- Skip-to-main-content link, keyboard-accessible alternatives to all drag-and-drop widget/task reordering (Move Up / Move Down controls), visible `:focus-visible` rings, `prefers-reduced-motion` compliance.
- Explicit UI states designed for every screen: **Loading**, **Skeleton**, **Empty**, **Error with recovery CTA**, **Offline banner (read-only indicator)**, **Saving/Success**, **Validation inline errors**, **409 Optimistic Concurrency Conflict resolution modal**, **Permission Denied**, and **Reconnected notification**.
