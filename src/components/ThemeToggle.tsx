import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../state/ThemeContext';

// Two-segment Dark / Light control (Design System V2 — Theme Toggle).
// Variant "segments" is the labeled control for the Settings page; "icon" is
// the compact sun/moon button for the top bar. Both read/write ThemeContext,
// which persists to localStorage and flips <html data-theme>.

export const ThemeToggle = ({ variant = 'segments' }: { variant?: 'segments' | 'icon' }) => {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    const nextLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={nextLabel}
        aria-label={nextLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition"
        style={{
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-bg-surface-alt)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  const options: { value: 'dark' | 'light'; label: string; icon: typeof Sun }[] = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
  ];

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex h-7 items-center gap-0.5 rounded-md p-0.5"
      style={{ background: 'var(--color-bg-surface-alt)' }}
    >
      {options.map((option) => {
        const active = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition"
            style={{
              background: active ? 'var(--color-bg-surface)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <Icon size={13} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
