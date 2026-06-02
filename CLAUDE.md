# OrangeCat

AI-native platform for universal economic and governance participation — "My Cat" AI agent enabling any identity to earn, fund, lend, invest, and govern freely with any currency.

FleetCrown (rebranded from Cockpit) is a live customer project (see "FleetCrown" and "OrangeCat" projects under Mao Nakamoto / FleetWave on this platform). Typed "customer" stakeholder edge + shared BTC wallet. Integration is real: FleetCrown production layer + OrangeCat economic layer. Changes here (e.g. stakeholder_relationships, project profiles) directly improve UX for FleetCrown and all future customers like FleetWave.

@~/.claude/CLAUDE.md
@.claude/CLAUDE.md

## Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Framework  | Next.js 15, TypeScript 5.8         |
| Styling    | Tailwind CSS 3.3                   |
| Database   | Supabase (PostgreSQL + Auth + RLS) |
| Bitcoin    | Lightning Network, BTCPay, NWC     |
| Deployment | Vercel                             |

---

## Design System

### Token SSOT: `src/app/globals.css`

OrangeCat uses a **dual-token system**: shadcn/ui HSL CSS vars for component theming + literal hex Tailwind extensions for brand colors.

**CSS Custom Properties in `:root` (light mode):**

```css
/* Bitcoin-specific (literal hex — not HSL) */
--bitcoin-orange: #f7931a --bitcoin-orange-dark: #e8830f
  /* shadcn/ui component tokens (HSL channel values, used as hsl(var(--name))) */ --background: 0 0%
  100% --foreground: 0 0% 3.9% --card: 0 0% 100% --card-foreground: 0 0% 3.9% --popover: 0 0% 100%
  --popover-foreground: 0 0% 3.9% --primary: 180 100% 27.5% /* Tiffany Blue */
  --primary-foreground: 0 0% 98% --secondary: 0 0% 96.1% --secondary-foreground: 0 0% 9% --muted: 0
  0% 96.1% --muted-foreground: 0 0% 45.1% --accent: 180 52% 94% --accent-foreground: 180 100% 14%
  --destructive: 0 84.2% 60.2% --destructive-foreground: 0 0% 98% --border: 0 0% 89.8% --input: 0 0%
  89.8% --ring: 180 100% 34.3% /* Focus ring — Tiffany Blue */ --chart-1: 12 76% 61% --chart-2: 173
  58% 39% --chart-3: 197 37% 24% --chart-4: 43 74% 66% --chart-5: 27 87% 67% --radius: 0.5rem;
```

**`.dark` overrides (dark mode):**

```css
--background: 0 0% 3.9% --foreground: 0 0% 98% --primary: 180 58% 47.5%
  /* Tiffany Blue (lighter for dark bg) */ --primary-foreground: 0 0% 5% --accent: 180 100% 14%
  --accent-foreground: 180 52% 94% --destructive: 0 62.8% 30.6% --ring: 180 58% 47.5%
  /* ...remaining shadcn dark overrides */;
```

**Tailwind config (`tailwind.config.ts`) — mixed pattern:**

shadcn/ui tokens correctly reference CSS vars:

```
background: 'hsl(var(--background))'
foreground: 'hsl(var(--foreground))'
primary.DEFAULT: 'hsl(var(--primary))'
primary.foreground: 'hsl(var(--primary-foreground))'
secondary.DEFAULT: 'hsl(var(--secondary))'
muted.DEFAULT: 'hsl(var(--muted))'
accent.DEFAULT: 'hsl(var(--accent))'
destructive.DEFAULT: 'hsl(var(--destructive))'
border: 'hsl(var(--border))'
input: 'hsl(var(--input))'
ring: 'hsl(var(--ring))'
chart.1–5: 'hsl(var(--chart-1))' … 'hsl(var(--chart-5))'
```

Brand palette extensions use **literal hex values** (⚠️ violations — should reference CSS vars):

```
tiffany.50→#E6F7F7  .100→#BAEBEA  .200→#8EDEDD  .300→#62D2D0  .400→#36C6C3
          .500→#0ABAB5  .600→#089B96  .700→#067C77  .800→#045D58  .900→#023E39

orange.50→#FFF5F0  .100→#FFE6D9  .200→#FFD4C2  .300→#FFBFA6  .400→#FFA07A
       .500→#FF8C69  .600→#FF6B00  .700→#E65C00  .800→#CC5200  .900→#B34700

gray.50→#f9fafb  .100→#f3f4f6  .200→#e5e7eb  .300→#d1d5db  .400→#9ca3af
     .500→#6b7280  .600→#4b5563  .700→#374151  .800→#1f2937  .900→#111827

bitcoinOrange: '#F7931A'   ⚠️ literal hex, not CSS var
```

Font: `var(--font-inter)` (CSS var, set externally via Next.js `localFont`)

**Design token TypeScript file: `src/lib/theme.ts`**

`src/lib/theme.ts` provides a centralized theme with raw hex values and Tailwind class generators. It is a secondary TypeScript reference — **not the SSOT** (that's `globals.css`). Use it for non-CSS contexts (e.g. inline `style=` props when Tailwind classes won't work, Recharts charts).

Key exports:

- `colors` — raw hex palette: `primary.main: '#0ABAB5'`, `bitcoin.main: '#F7931A'`, `secondary.main: '#FF6B35'`, status colors, neutrals
- `componentColors` — class strings + style objects for `bitcoinElement`, `currencyDisplay`, `statusBadge`

**Issue:** `colors.bitcoin.dark: '#CC5200'` in `theme.ts` conflicts with `orange.800: '#CC5200'` in `tailwind.config.ts` but `bitcoin.dark` is darker than `bitcoinOrange` — the orange scale is unrelated to Bitcoin Orange. Use `theme.ts` bitcoin values only for Bitcoin-specific elements.

**Utility classes defined in `globals.css` (`@layer components`):**

Form elements: `.input`, `.input-mobile`, `.textarea`, `.select`
Progress/scores: `.progress-bar`, `.progress-bar-fill`, `.trust-score`, `.trust-score-fill`, `.transparency-score`, `.transparency-score-fill`
KPI: `.kpi-card`, `.kpi-progress`, `.kpi-progress-fill`
Layout: `.container` (max-w-7xl, responsive px), `.grid-responsive` (1→2→3 cols), `.grid-responsive-wide` (1→2→4 cols)
Mobile/PWA: `.touch-target`, `.safe-area-padding*`, `.safe-area-margin*`, `.pwa-layout`, `.pwa-status-bar`, `.pwa-install-banner`
Modals: `.modal-mobile`, `.modal-content-mobile`
Lists: `.touch-list`, `.touch-list-item`
Typography: `.text-balance`, `.line-clamp-1/2/3/4`, `.mobile-text-sm/base/lg`
Misc: `.scrollbar-hide`, `.tap-highlight-none`, `.viewport-fix`, `.bitcoin-text`, `.bitcoin-card`, `.label`, `.toast-mobile`, `.haptic-feedback`

**Body default:** `bg-gradient-to-b from-tiffany-50 to-white text-slate-800`

### Bitcoin Orange Rule

`--bitcoin-orange: #f7931a` and `bitcoinOrange: '#F7931A'` (tailwind config) are **only for Bitcoin-related UI** — balances, Lightning indicators, Bitcoin icons. Never use for general brand elements.

### SSOT Rule

All shadcn/ui component tokens live in `globals.css` `:root` and are correctly referenced by tailwind.config via `hsl(var(--...))`. This part of the system is correct.

The brand palette (`tiffany`, `orange`, `bitcoinOrange`, `gray`) is defined as literal hex in `tailwind.config.ts` — a violation of the SSOT principle. To retheme, both `globals.css` and `tailwind.config.ts` must change.

**Violations to fix when touching UI:**

- Brand palette in `tailwind.config.ts` uses literal hex — should define CSS vars in `globals.css` and reference with `var(--tiffany-500)` etc.
- `bitcoinOrange: '#F7931A'` in `tailwind.config.ts` duplicates `--bitcoin-orange: #f7931a` in `globals.css` — two sources of truth for the same token

**Audit commands:**

```bash
# Find arbitrary hex violations in className props
grep -rn '\[#' src/
# Current count: 0 (clean)

# Find inline style hex violations
grep -rn "style={{.*#" src/
```
