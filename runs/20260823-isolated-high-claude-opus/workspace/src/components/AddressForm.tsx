'use client';

export type AddressFields = {
  name: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

export const EMPTY_ADDRESS: AddressFields = {
  name: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
};

type Props = {
  value: AddressFields;
  onChange: (next: AddressFields) => void;
  disabled: boolean;
  /** Field names that failed validation, so we can mark them red. */
  invalid: ReadonlySet<keyof AddressFields>;
};

/**
 * The floating-label form from the original store: at rest the inputs are
 * transparent and you see only the labels, which slide up and shrink as each
 * field is filled.
 */
export function AddressForm({ value, onChange, disabled, invalid }: Props) {
  const field = (
    key: keyof AddressFields,
    label: string,
    placeholder: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className={`float${invalid.has(key) ? ' is-invalid' : ''}`}>
      <input
        className={value[key] ? '' : 'is-empty'}
        value={value[key]}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        aria-label={label}
        aria-invalid={invalid.has(key) || undefined}
        {...extra}
      />
      <span className="caption">
        <span>{label}</span>
      </span>
    </label>
  );

  return (
    <>
      {field('name', 'Name', 'Jenny Rosen', { name: 'name', autoComplete: 'name', required: true })}
      {field('address1', 'Shipping address', '185 Berry St', {
        name: 'address-line1',
        autoComplete: 'address-line1',
        required: true,
      })}
      {field('address2', 'Apartment or suite (optional)', 'Suite 550', {
        name: 'address-line2',
        autoComplete: 'address-line2',
      })}
      <div className="float-grid">
        {field('city', 'City', 'San Francisco', {
          name: 'city',
          autoComplete: 'address-level2',
          required: true,
        })}
        {field('state', 'State', 'CA', {
          name: 'state',
          autoComplete: 'address-level1',
          maxLength: 2,
          required: true,
        })}
        {field('zip', 'ZIP', '94107', {
          name: 'postal-code',
          autoComplete: 'postal-code',
          inputMode: 'numeric',
          maxLength: 10,
          required: true,
        })}
      </div>
      {field('email', 'Email (for your receipt)', 'jenny@example.com', {
        name: 'email',
        type: 'email',
        autoComplete: 'email',
        required: true,
      })}
    </>
  );
}

/** Client-side pre-flight so obvious mistakes never cost a round trip. */
export function validateAddress(value: AddressFields): Set<keyof AddressFields> {
  const bad = new Set<keyof AddressFields>();
  if (value.name.trim().length < 2) bad.add('name');
  if (value.address1.trim().length < 3) bad.add('address1');
  if (value.city.trim().length < 2) bad.add('city');
  if (!/^[A-Za-z]{2}$/.test(value.state.trim())) bad.add('state');
  if (!/^\d{5}(-\d{4})?$/.test(value.zip.trim())) bad.add('zip');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email.trim())) bad.add('email');
  return bad;
}
