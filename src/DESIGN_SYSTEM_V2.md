# OfficeOS Design System V2 — Linear-style Compact

**Status:** Locked spec for UI redesign (REVISED — dual theme)  
**Target:** Web only (no mobile optimization)  
**Aesthetic:** Professional, information-dense, minimal chrome  
**Theme:** TWO themes — Dark (primary/default) and Light (secondary, toggle-accessible). Monochrome + one red accent in both.

---

## CRITICAL: Dual Theme Requirement

This spec was originally written light-mode-only and caused a severe contrast bug when applied as a wholesale replacement of the existing dark theme (light text rendered on light backgrounds — large parts of the dashboard became unreadable). This revision fixes that.

**Rules going forward:**

1. **Dark mode is the default and primary theme.** It must look like the original Geekynd Hub aesthetic (dark background, red accent, light text) but with the V2 compact spacing/sizing (smaller buttons, tighter padding, 4-6px radius, smaller fonts).
2. **Light mode is a fully-specified second theme**, not an inversion hack. Every color below has an explicit dark-mode value AND light-mode value. Nothing is "swap the background and hope text still works."
3. **All colors are defined as CSS variables** (e.g. `--color-bg-primary`, `--color-text-primary`) so components never hardcode a hex value. Components read the variable; the variable's value changes based on `[data-theme="dark"]` or `[data-theme="light"]` on the root element.
4. **A theme toggle** must exist (Settings page, or top-right header) that flips `data-theme` and persists the choice (localStorage key `officeos:theme`, default `dark`).
5. **Every component must be visually verified in BOTH themes** before being marked complete. "Looks fine in dark" is not sufficient sign-off.

---

## Typography

| Element | Size | Weight | Line-height | Color (variable) |
|---------|------|--------|-------------|-------|
| Page title (h1) | 18px | 600 | 1.4 | `var(--color-text-primary)` |
| Section heading (h2) | 14px | 600 | 1.4 | `var(--color-text-primary)` |
| Page description | 13px | 400 | 1.5 | `var(--color-text-secondary)` |
| Body text / labels | 13px | 400 | 1.5 | `var(--color-text-primary)` |
| Small caption | 12px | 400 | 1.4 | `var(--color-text-muted)` |
| Input placeholder | 13px | 400 | 1.5 | `var(--color-text-muted)` |
| Button text | 13px | 500 | 1.4 | varies by button |

**Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`

---

## Spacing

All measurements in pixels. No rem units for component internals.

| Element | Padding | Margin | Gap |
|---------|---------|--------|-----|
| Form inputs | 6px (v) 8px (h) | — | — |
| Button | 6px (v) 12px (h) | — | — |
| Table row | 8px (v) 12px (h) | — | — |
| Table cell | 8px (v) 12px (h) | — | — |
| Card | 16px | — | — |
| Modal header/footer | 16px | — | — |
| Modal body | 16px | — | — |
| Section spacing | — | 16-24px between sections | — |
| Form field spacing | — | 12px between fields | — |
| Button group | — | — | 8px |
| Filter row elements | — | — | 8px |

---

## Borders & Radius

| Element | Border | Radius |
|---------|--------|--------|
| Cards | 1px solid `var(--color-border-weak)` | 6px |
| Inputs | 1px solid `var(--color-border-strong)` (focus: `var(--color-accent)`) | 4px |
| Buttons | Varies (see buttons section) | 4px |
| Tables | 1px solid `var(--color-border-weak)` | 6px |
| Modals | 1px solid `var(--color-border-weak)` | 6px |
| Section dividers | 1px solid `var(--color-border-weak)` | 0px |

**No shadows in light mode** (cards have a 1px border only). **Dark mode may use a very subtle shadow** (`0 1px 3px rgba(0,0,0,0.4)`) since borders alone read weaker against a dark background. Modals in both themes use `0 10px 40px rgba(0,0,0,0.35)` (dark) or `0 10px 40px rgba(0,0,0,0.12)` (light) to lift them off the page.

---

## Colors — CSS Variables (Dual Theme)

Define these as CSS custom properties on `:root` (or `[data-theme]` selectors). Components NEVER hardcode hex values — always reference the variable. This is what prevents the light/dark contrast bug from recurring.

```css
/* Dark theme (default) */
[data-theme="dark"] {
  --color-accent: #ef4444;          /* slightly brighter red for dark bg legibility */
  --color-accent-hover: #f87171;
  --color-bg-page: #0f0f0f;
  --color-bg-surface: #1a1a1a;      /* cards, sidebar, modals */
  --color-bg-surface-alt: #232323;  /* table header, hover states */
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #707070;
  --color-border-strong: #3a3a3a;
  --color-border-weak: #2a2a2a;

  --color-badge-success-bg: #0c2e1f;
  --color-badge-success-text: #4ade80;
  --color-badge-warning-bg: #3a2a0c;
  --color-badge-warning-text: #facc15;
  --color-badge-info-bg: #0c2a3a;
  --color-badge-info-text: #38bdf8;
  --color-badge-error-bg: #3a0c0c;
  --color-badge-error-text: #f87171;
}

/* Light theme */
[data-theme="light"] {
  --color-accent: #dc2626;
  --color-accent-hover: #b91c1c;
  --color-bg-page: #f8f7f5;
  --color-bg-surface: #ffffff;      /* cards, sidebar, modals */
  --color-bg-surface-alt: #fafaf8;  /* table header, hover states */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-text-muted: #999999;
  --color-border-strong: #d0cec9;
  --color-border-weak: #e0dfdb;

  --color-badge-success-bg: #dbeafe;
  --color-badge-success-text: #0c447c;
  --color-badge-warning-bg: #fef3c7;
  --color-badge-warning-text: #854f0b;
  --color-badge-info-bg: #cffafe;
  --color-badge-info-text: #0e7490;
  --color-badge-error-bg: #fecaca;
  --color-badge-error-text: #7f1d1d;
}
```

### Usage rule
Every component style references `var(--color-text-primary)`, `var(--color-bg-surface)`, etc. — never `#1a1a1a` or `#ffffff` directly, except inside this variable block itself. This is non-negotiable: it's the only way to guarantee both themes stay correct as the app grows.

### Contrast verification (both themes pass WCAG AA for normal text, 4.5:1 minimum)
- Dark: `#f5f5f5` on `#0f0f0f` → ~17:1 ✓
- Dark: `#a3a3a3` on `#1a1a1a` → ~7.5:1 ✓
- Light: `#1a1a1a` on `#ffffff` → ~17:1 ✓
- Light: `#666666` on `#ffffff` → ~5.7:1 ✓

If Claude Code introduces any new color, it must compute and report the contrast ratio against the background it sits on, for both themes, before shipping.

---

## Buttons

### Primary Button (Solid Red)
```
Background: var(--color-accent)
Text: white (both themes — red is dark enough in both)
Padding: 6px 12px
Font: 13px, weight 500
Border: none
Radius: 4px
Hover: background var(--color-accent-hover)
Active: scale(0.98)
```

**Example:** `+ Add client`, `Save`, `Create`

### Secondary Button (Outline)
```
Background: var(--color-bg-surface)
Text: var(--color-text-primary)
Padding: 6px 12px
Font: 13px, weight 500
Border: 1px solid var(--color-border-strong)
Radius: 4px
Hover: background var(--color-bg-surface-alt)
Active: scale(0.98)
```

**Example:** `Cancel`, `Close`, `Delete`

### Tertiary Button (Text only)
```
Background: transparent
Text: var(--color-accent)
Padding: 6px 12px
Font: 13px, weight 500
Border: none
Radius: 4px
Hover: background (red at 10% opacity — works in both themes since it's a tint, not a solid)
Active: scale(0.98)
```

**Example:** Links in tables, inline actions

### Disabled State (any button)
```
Opacity: 0.5
Cursor: not-allowed
```

---

## Sidebar

**Width:** 160px (compressed)  
**Background:** `var(--color-bg-surface)`  
**Border right:** 1px solid `var(--color-border-weak)`

### Navigation Items
```
Padding: 8px 12px
Font: 13px
Height: 32px (minimum touch target)
Display: flex; align-items: center; gap: 8px
Cursor: pointer
Border-left: 2px solid (active: var(--color-accent), inactive: transparent)
Background: (active: var(--color-bg-surface-alt), inactive: var(--color-bg-surface))
Color: (active: var(--color-text-primary), inactive: var(--color-text-secondary))
Hover: background var(--color-bg-surface-alt)
```

### Section Headers
```
Padding: 8px 12px
Font: 11px, weight 500
Color: var(--color-text-muted)
Text-transform: uppercase
Letter-spacing: 0.5px
Border-bottom: 1px solid var(--color-border-weak)
```

---

## Tables

### Container
```
Background: var(--color-bg-surface)
Border: 1px solid var(--color-border-weak)
Radius: 6px
Overflow: hidden
```

### Header Row
```
Background: var(--color-bg-surface-alt)
Border-bottom: 1px solid var(--color-border-weak)
Font-weight: 600
Color: var(--color-text-primary)
Font-size: 13px
```

### Data Rows
```
Border-bottom: 1px solid var(--color-border-weak)
Font-size: 13px
Color: var(--color-text-primary)
Hover: background var(--color-bg-surface-alt)
```

### Table Cell
```
Padding: 8px 12px (vertical: 8px, horizontal: 12px)
Text-align: left (default)
Height: 36px (minimum)
```

### Status Badge (in tables)
```
Display: inline-block
Padding: 2px 8px
Font-size: 12px
Font-weight: 500
Border-radius: 3px
Background: var(--color-badge-{type}-bg)
Color: var(--color-badge-{type}-text)
```

---

## Forms & Inputs

### Text Input
```
Padding: 6px 8px
Font: 13px
Border: 1px solid var(--color-border-strong)
Radius: 4px
Background: var(--color-bg-surface)
Color: var(--color-text-primary)
Placeholder: var(--color-text-muted)
Focus: outline none, border-color var(--color-accent), box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15) (dark) / rgba(220, 38, 38, 0.1) (light)
```

### Select / Dropdown
```
Padding: 6px 8px
Font: 13px
Border: 1px solid var(--color-border-strong)
Radius: 4px
Background: var(--color-bg-surface)
Color: var(--color-text-primary)
Focus: outline none, border-color var(--color-accent)
```

### Textarea
```
Padding: 6px 8px
Font: 13px
Border: 1px solid var(--color-border-strong)
Radius: 4px
Background: var(--color-bg-surface)
Color: var(--color-text-primary)
Resize: vertical
Focus: outline none, border-color var(--color-accent)
```

### Label
```
Font: 12px, weight 500
Color: var(--color-text-secondary)
Margin-bottom: 4px
Display: block
```

---

## Modals & Dialogs

### Modal Container
```
Background: var(--color-bg-surface)
Border-radius: 6px
Box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35) (dark) / rgba(0, 0, 0, 0.12) (light)
Max-width: 400px (standard), 500px (wide)
Overflow: hidden
```

### Modal Header
```
Padding: 16px
Border-bottom: 1px solid var(--color-border-weak)
Font: 14px, weight 600
Color: var(--color-text-primary)
```

### Modal Body
```
Padding: 16px
Display: flex; flex-direction: column; gap: 12px
```

### Modal Footer
```
Padding: 12px 16px
Border-top: 1px solid var(--color-border-weak)
Display: flex; gap: 8px; justify-content: flex-end
```

### Modal Backdrop
```
Background: rgba(0, 0, 0, 0.5) (dark theme) / rgba(0, 0, 0, 0.4) (light theme)
```
The backdrop must always be dark-tinted regardless of theme — this is the one place a fixed value is correct, since it's an overlay over the whole page, not page content.

---

## Tabs (if needed)

```
Font: 13px, weight 500
Padding: 8px 12px
Border-bottom: 2px solid (active: var(--color-accent), inactive: transparent)
Color: (active: var(--color-text-primary), inactive: var(--color-text-secondary))
Cursor: pointer
Hover: color var(--color-text-primary)
```

---

## Cards & Surfaces

### Card
```
Background: var(--color-bg-surface)
Border: 1px solid var(--color-border-weak)
Radius: 6px
Padding: 16px
Box-shadow: none (light) / 0 1px 3px rgba(0,0,0,0.4) (dark, subtle lift)
```

### Card Header (optional)
```
Font: 14px, weight 600
Color: var(--color-text-primary)
Margin-bottom: 12px
Border-bottom: 1px solid var(--color-border-weak)
Padding-bottom: 12px
```

### Card Body
```
Font: 13px
Color: var(--color-text-primary)
```

---

## Status Pills / Badges

Background and text always come from the matching pair in the Colors section — never mix a bg from one pair with a text from another (contrast is only guaranteed within a pair).

| Semantic meaning | Variable pair |
|---|---|
| Active / Success | `var(--color-badge-success-bg)` / `var(--color-badge-success-text)` |
| Onboarding / Warning | `var(--color-badge-warning-bg)` / `var(--color-badge-warning-text)` |
| Paused / Info | `var(--color-badge-info-bg)` / `var(--color-badge-info-text)` |
| Cancelled / Error | `var(--color-badge-error-bg)` / `var(--color-badge-error-text)` |

```
Padding: 2px 8px
Font: 12px, weight 500
Border-radius: 3px (subtle roundness, not pill-like)
```

---

## Lists & Collections

### Filter Row
```
Display: flex; gap: 8px
Margin-bottom: 16px
Flex-wrap: wrap
Align-items: center
Font: 13px
```

### Filter Control (input / select)
```
Same as Forms section above
```

### Empty State
```
Text-align: center
Padding: 40px 16px
Color: var(--color-text-secondary)
Font: 13px
```

---

## Header / Top Bar

Update font sizes and spacing to match the compact system above, using `var(--color-bg-surface)` / `var(--color-text-primary)` / `var(--color-border-weak)`. No layout restructure needed otherwise.

---

## Theme Toggle

A toggle control must be added in two places:
1. **Settings page** — a labeled row "Appearance" with a two-option control (Dark / Light)
2. **Top bar (optional, recommended)** — a small icon button (sun/moon) near the user menu for quick access

### Behavior
```
On mount: read localStorage key "officeos:theme"
  - if "dark" or missing → set data-theme="dark" on <html> (default)
  - if "light" → set data-theme="light" on <html>
On toggle: update data-theme attribute + write to localStorage["officeos:theme"]
```

### Toggle control style
```
Two-segment control, 28px height
Background: var(--color-bg-surface-alt)
Active segment: var(--color-bg-surface), text var(--color-text-primary)
Inactive segment: transparent, text var(--color-text-secondary)
Radius: 4px
Font: 12px, weight 500
```

---

## Sidebar Collapse on Mobile

**Not applicable.** Web-only. No responsive behavior for mobile.

---

## Accessibility

- Minimum touch target: 32px height
- Focus states: 2px outline or border, always visible, using `var(--color-accent)` in both themes
- Buttons: always have descriptive text or aria-label
- Form labels: always associated with inputs (`<label for="id">`)
- Status badges: text + background color (not color alone)
- Both themes independently meet WCAG AA contrast (4.5:1 for body text) — see verification table in Colors section

---

## Implementation Checklist (REVISED — fixing the broken light pass)

This replaces the original single-theme checklist. Claude Code should treat this as a correction pass, not a from-scratch redo — the spacing/sizing work already done is mostly reusable; what's broken is the color layer.

**Step 0 — Audit (do this first, report back before changing anything):**
- [ ] Grep the codebase for hardcoded hex colors in component files (`.tsx`, `.css`) introduced during the light-mode pass
- [ ] List every file where a hardcoded light-theme color was used instead of a variable
- [ ] Confirm current default theme behavior (is dark mode reachable at all right now, or was it fully replaced?)

**Step 1 — Variable infrastructure:**
- [ ] Add the full CSS variable block (both `[data-theme="dark"]` and `[data-theme="light"]`) to the global stylesheet
- [ ] Set `data-theme="dark"` as the default on `<html>` if no localStorage value exists
- [ ] Build the theme toggle (Settings page row + optional top-bar icon) wired to localStorage + the data-theme attribute

**Step 2 — Replace hardcoded colors with variables:**
- [ ] `.surface`, `.field`, `.btn-primary`, `.btn-secondary` (the four base classes) — rewrite to reference variables only
- [ ] Sidebar — rewrite to reference variables
- [ ] Tables — rewrite to reference variables
- [ ] Modals — rewrite to reference variables
- [ ] Status badges — rewrite to reference variable pairs (never mix bg/text from different pairs)
- [ ] All other components — sweep for any remaining hardcoded hex values

**Step 3 — Spacing/sizing (carry over from original pass, verify still applied):**
- [ ] Font sizes (18px h1, 13px body, etc.)
- [ ] Padding (8px rows, 6px buttons, etc.)
- [ ] Border-radius (4px inputs/buttons, 6px cards/modals)
- [ ] Sidebar width 160px
- [ ] Icons removed from tables

**Step 4 — Verification (mandatory, both themes):**
- [ ] Load every major page (Dashboard, Employees, Clients, Pipeline, Subscriptions, HR Panel, Workspace, Settings) in dark mode — confirm readable
- [ ] Toggle to light mode, reload same pages — confirm readable, nothing washed out
- [ ] Specifically re-check the Dashboard (the page in the bug screenshot) in both themes — greeting text, quick action labels, pending actions list, all must have visible contrast
- [ ] Check all modals open correctly in both themes
- [ ] Check all status badges/pills are legible in both themes
- [ ] Run `npx tsc -b` and `npx vite build` — must pass clean

**Step 5 — Report:**
- [ ] List every file touched
- [ ] Confirm theme toggle works and persists across reload
- [ ] Paste a screenshot-equivalent description or confirm visual check of the Dashboard in both themes specifically (since that's the page that broke)
- [ ] Any remaining hardcoded colors found, with file:line references, if any couldn't be converted

---

## Reference

This design follows the **Linear** and **Slack** aesthetic patterns:
- Information-dense without clutter
- Monochrome with one accent color
- Minimal ornamentation (no gradients, glows, shadows)
- Professional and business-focused
- Optimized for fast scanning and data entry
- Full dark + light theme support, switchable, both contrast-checked

No decorative elements. Every pixel serves a function. Every color comes from a variable — never a hardcoded hex value in component code.
