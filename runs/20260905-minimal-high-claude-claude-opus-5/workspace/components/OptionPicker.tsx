'use client';

type Props<T extends string> = {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
};

export default function OptionPicker<T extends string>({
  name,
  legend,
  value,
  options,
  disabled,
  onChange,
}: Props<T>) {
  return (
    <fieldset className="options" disabled={disabled}>
      <legend className="sr-only" style={{ position: 'absolute', left: -9999 }}>
        {legend}
      </legend>
      <div className="options-row">
        {options.map((option) => (
          <div className="radio" key={option.value}>
            <input
              id={`${name}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <label htmlFor={`${name}-${option.value}`}>{option.label}</label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
