#!/usr/bin/env bash
# Design System V2 color sweep — deterministic 1:1 hardcoded->variable mapping.
# Pixel-identical in dark mode (every RHS == the LHS's exact value).
# Judgment cases (text-slate-300) and dead classes (accent-100/300/400) are
# intentionally NOT handled here — left untouched for manual review.
#
# Order matters: longer/alpha-suffixed patterns are replaced before their
# bare forms so a generic rule can't corrupt a specific one.
set -euo pipefail

f="$1"

# Helper: portable in-place sed (GNU sed on this Git Bash).
s() { sed -i "s|$1|$2|g" "$f"; }

# ---- Accent alpha tints (BEFORE bare accent-500) ----
for a in 10 12 14 15 20 25 30 35 40 45 50 55 60 70 80; do
  s "bg-accent-500/$a" "bg-[var(--color-accent-$a)]"
  s "hover:bg-accent-500/$a" "hover:bg-[var(--color-accent-$a)]"
  s "border-accent-500/$a" "border-[color:var(--color-accent-$a)]"
  s "hover:border-accent-500/$a" "hover:border-[color:var(--color-accent-$a)]"
  s "ring-accent-500/$a" "ring-[var(--color-accent-$a)]"
  s "text-accent-500/$a" "text-[color:var(--color-accent-$a)]"
  s "from-accent-500/$a" "from-[var(--color-accent-$a)]"
  s "to-accent-500/$a" "to-[var(--color-accent-$a)]"
  s "via-accent-500/$a" "via-[var(--color-accent-$a)]"
done
s "accent-600/35" "[color:var(--color-accent-hover-35)]"

# ---- Bare accent-500 / accent-600 (after alphas) ----
s "bg-accent-500" "bg-[var(--color-accent)]"
s "text-accent-500" "text-[color:var(--color-accent)]"
s "border-accent-500" "border-[color:var(--color-accent)]"
s "ring-accent-500" "ring-[color:var(--color-accent)]"
s "from-accent-500" "from-[var(--color-accent)]"
s "to-accent-500" "to-[var(--color-accent)]"
s "via-accent-500" "via-[var(--color-accent)]"
s "bg-accent-600" "bg-[var(--color-accent-hover)]"
s "text-accent-600" "text-[color:var(--color-accent-hover)]"
s "to-accent-600" "to-[var(--color-accent-hover)]"
s "from-accent-600" "from-[var(--color-accent-hover)]"
s "via-accent-600" "via-[var(--color-accent-hover)]"

# ---- White-tint fills (bg-white/[a]) ----
s "bg-white/\[0.025\]" "bg-[var(--color-fill-005)]"
s "bg-white/\[0.035\]" "bg-[var(--color-fill-035)]"
s "bg-white/\[0.045\]" "bg-[var(--color-fill-045)]"
s "bg-white/\[0.055\]" "bg-[var(--color-fill-055)]"
s "bg-white/\[0.04\]" "bg-[var(--color-fill-04)]"
s "bg-white/\[0.06\]" "bg-[var(--color-fill-06)]"
s "bg-white/\[0.10\]" "bg-[var(--color-fill-10)]"
s "bg-white/10" "bg-[var(--color-fill-10)]"
s "hover:bg-white/\[0.055\]" "hover:bg-[var(--color-fill-055)]"
s "hover:bg-white/\[0.06\]" "hover:bg-[var(--color-fill-06)]"

# ---- Black overlays (bg-black/N). Backdrops handled separately if any. ----
for n in 20 25 30 35 40 45 50 55 65 70 90; do
  s "bg-black/$n" "bg-[var(--color-overlay-$n)]"
done

# ---- White borders ----
s "border-white/10" "border-[color:var(--color-border-weak)]"
s "border-white/20" "border-[color:var(--color-border-strong)]"
s "border-white/5" "border-[color:var(--color-line-05)]"
s "border-white/12" "border-[color:var(--color-line-12)]"
s "border-white/15" "border-[color:var(--color-line-15)]"
s "border-white/25" "border-[color:var(--color-line-25)]"
s "divide-white/10" "divide-[color:var(--color-divide)]"

# ---- text-white ON solid colored fills -> --color-on-accent (fixed white,
#      both themes). These run BEFORE the generic text-white rule. The bg-*
#      tokens have already been converted to var() above, so match those. ----
# accent solid + text-white (button label / pill / avatar initials)
s "bg-\[var(--color-accent)\] text-white" "bg-[var(--color-accent)] text-[color:var(--color-on-accent)]"
s "bg-\[var(--color-accent-hover)\] text-\[10px\] font-bold text-white" "bg-[var(--color-accent-hover)] text-[10px] font-bold text-[color:var(--color-on-accent)]"
s "bg-\[var(--color-accent-hover)\] text-sm font-bold text-white" "bg-[var(--color-accent-hover)] text-sm font-bold text-[color:var(--color-on-accent)]"
s "bg-\[var(--color-accent-hover)\] text-xs font-bold text-white" "bg-[var(--color-accent-hover)] text-xs font-bold text-[color:var(--color-on-accent)]"
s "bg-\[var(--color-accent-hover)\] text-2xl font-bold text-white" "bg-[var(--color-accent-hover)] text-2xl font-bold text-[color:var(--color-on-accent)]"
# rose destructive button
s "bg-\[var(--color-error-solid)\] px-4 py-2.5 text-sm font-semibold text-white" "bg-[var(--color-error-solid)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-on-accent)]"
# emerald solid (onboarding complete)
s "bg-emerald-500/80 text-white" "bg-[var(--color-success-fill-80)] text-[color:var(--color-on-accent)]"

# ---- Text: white + slate (slate-300 intentionally skipped) ----
s "text-white" "text-[color:var(--color-text-primary)]"
s "text-slate-100" "text-[color:var(--color-text-bright)]"
s "text-slate-200" "text-[color:var(--color-text-soft)]"
s "text-slate-400" "text-[color:var(--color-text-secondary)]"
s "text-slate-500" "text-[color:var(--color-text-muted)]"
s "text-slate-600" "text-[color:var(--color-text-faint)]"

# ---- Neutral slate at alpha (BEFORE bare slate bg, so /N isn't orphaned) ----
s "bg-slate-500/16" "bg-[var(--color-neutral-fill-16)]"
s "bg-slate-500/10" "bg-[var(--color-neutral-fill-10)]"
s "border-slate-400/25" "border-[color:var(--color-neutral-line-25)]"
s "ring-slate-400/20" "ring-[color:var(--color-neutral-ring-20)]"
s "ring-slate-500/15" "ring-[color:var(--color-neutral-ring-15)]"

# ---- Neutral slate backgrounds (bare) ----
s "bg-slate-400" "bg-[var(--color-slate-bg-400)]"
s "bg-slate-500" "bg-[var(--color-slate-bg-500)]"
s "bg-slate-700" "bg-[var(--color-slate-bg-700)]"
s "bg-slate-800" "bg-[var(--color-slate-bg-800)]"

# ---- Semantic: rose=error (alphas before bare) ----
s "text-rose-200/75" "text-[color:var(--color-error-text-200-75)]"
s "bg-rose-500/10" "bg-[var(--color-error-fill-10)]"
s "bg-rose-500/12" "bg-[var(--color-error-fill-12)]"
s "bg-rose-500/15" "bg-[var(--color-error-fill-15)]"
s "bg-rose-500/20" "bg-[var(--color-error-fill-20)]"
s "border-rose-400/20" "border-[color:var(--color-error-line-20)]"
s "border-rose-400/25" "border-[color:var(--color-error-line-25)]"
s "border-rose-400/30" "border-[color:var(--color-error-line-30)]"
s "ring-rose-400/25" "ring-[color:var(--color-error-ring-25)]"
s "ring-rose-500/40" "ring-[color:var(--color-error-ring-40)]"
s "text-rose-100" "text-[color:var(--color-error-text-100)]"
s "text-rose-200" "text-[color:var(--color-error-text-200)]"
s "text-rose-300" "text-[color:var(--color-error-text-300)]"
s "bg-rose-600" "bg-[var(--color-error-solid)]"
s "bg-rose-500" "bg-[var(--color-error-solid-500)]"

# ---- Semantic: emerald=success (alphas/shades before bare) ----
s "bg-emerald-500/10" "bg-[var(--color-success-fill-10)]"
s "bg-emerald-500/12" "bg-[var(--color-success-fill-12)]"
s "bg-emerald-500/15" "bg-[var(--color-success-fill-15)]"
s "bg-emerald-500/80" "bg-[var(--color-success-fill-80)]"
s "border-emerald-400/25" "border-[color:var(--color-success-line-25)]"
s "border-emerald-400/30" "border-[color:var(--color-success-line-30)]"
s "border-emerald-400" "border-[color:var(--color-success-line)]"
s "bg-emerald-400" "bg-[var(--color-success-solid-400)]"
s "ring-emerald-400/25" "ring-[color:var(--color-success-ring-25)]"
s "text-emerald-100" "text-[color:var(--color-success-text-100)]"
s "text-emerald-200" "text-[color:var(--color-success-text-200)]"
s "text-emerald-300" "text-[color:var(--color-success-text-300)]"

# ---- Semantic: amber=warning ----
s "bg-amber-500/10" "bg-[var(--color-warning-fill-10)]"
s "bg-amber-500/12" "bg-[var(--color-warning-fill-12)]"
s "border-amber-400/25" "border-[color:var(--color-warning-line-25)]"
s "ring-amber-400/25" "ring-[color:var(--color-warning-ring-25)]"
s "text-amber-200" "text-[color:var(--color-warning-text-200)]"
s "text-amber-300" "text-[color:var(--color-warning-text-300)]"

# ---- ink palette inset (bg-ink-950/35 = near-black overlay) ----
s "bg-ink-950/35" "bg-[var(--color-overlay-35)]"

# ---- Inline red-glow shadows (combined first, then singles) ----
s "shadow-\[0_26px_90px_rgba(0,0,0,0.65),0_0_44px_rgba(239,35,43,0.10)\]" "shadow-[var(--shadow-modal-glow)]"
s "shadow-\[0_0_18px_rgba(239,35,43,0.45)\]" "shadow-[var(--shadow-glow-18-45)]"
s "shadow-\[0_0_22px_rgba(239,35,43,0.08)\]" "shadow-[var(--shadow-glow-22-08)]"
s "shadow-\[0_0_22px_rgba(239,35,43,0.25)\]" "shadow-[var(--shadow-glow-22-25)]"
s "shadow-\[0_0_24px_rgba(239,35,43,0.2)\]" "shadow-[var(--shadow-glow-24-20)]"
s "shadow-\[0_0_24px_rgba(239,35,43,0.22)\]" "shadow-[var(--shadow-glow-24-22)]"
s "shadow-\[0_0_24px_rgba(239,35,43,0.26)\]" "shadow-[var(--shadow-glow-24-26)]"
s "shadow-\[0_0_28px_rgba(239,35,43,0.28)\]" "shadow-[var(--shadow-glow-28-28)]"
s "shadow-\[0_0_30px_rgba(239,35,43,0.12)\]" "shadow-[var(--shadow-glow-30-12)]"
s "shadow-\[0_0_30px_rgba(239,35,43,0.18)\]" "shadow-[var(--shadow-glow-30-18)]"
s "shadow-\[0_0_32px_rgba(239,35,43,0.12)\]" "shadow-[var(--shadow-glow-32-12)]"
s "shadow-\[0_0_34px_rgba(239,35,43,0.12)\]" "shadow-[var(--shadow-glow-34-12)]"
s "shadow-\[0_0_44px_rgba(239,35,43,0.18)\]" "shadow-[var(--shadow-glow-44-18)]"
s "shadow-\[inset_0_0_0_1px_rgba(239,35,43,0.25)\]" "shadow-[var(--shadow-glow-inset)]"

# ---- shadow-glow class (Tailwind config token). Keep as-is: it already reads
#      from the config and Step 1 left the config value intact; the body/glow
#      story is unchanged. NOT rewritten here (no hardcoded hex in the class). ----
