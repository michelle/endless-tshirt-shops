'use client';

/**
 * The original store's radio-pill selectors: a full-width row of segments,
 * selected one inverted to black. Rebuilt as a real radiogroup so it's usable
 * from the keyboard.
 */
export function OptionGroup<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase">
        {label}
      </legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={[
                'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm transition',
                selected
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-accent-wash)]',
              ].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="absolute h-0 w-0 opacity-0"
              />
              <span className="font-medium">{option.label}</span>
              {option.hint ? (
                <span className={selected ? 'text-[11px] text-white/60' : 'text-[11px] text-[var(--color-muted)]'}>
                  {option.hint}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
