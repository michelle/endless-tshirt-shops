'use client';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  hint?: string;
};

/** Segmented radio group used for both cut and size. */
export default function OptionPicker<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled,
  hint,
}: Props<T>) {
  return (
    <fieldset disabled={disabled} className="group">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={[
                'cursor-pointer select-none rounded-lg border px-4 py-2 text-sm font-medium transition',
                'focus-within:ring-2 focus-within:ring-sky-500/40 focus-within:ring-offset-1',
                selected
                  ? 'border-sky-600 bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name={legend}
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </fieldset>
  );
}
