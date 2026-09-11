/** Countries Prodigi reaches for the Gildan 64000 and that we price shipping for. */
export const COUNTRIES: { code: string; name: string; stateLabel?: string; postLabel?: string }[] = [
  { code: "US", name: "United States", stateLabel: "State", postLabel: "ZIP code" },
  { code: "CA", name: "Canada", stateLabel: "Province", postLabel: "Postal code" },
  { code: "GB", name: "United Kingdom", stateLabel: "County", postLabel: "Postcode" },
  { code: "IE", name: "Ireland", stateLabel: "County", postLabel: "Eircode" },
  { code: "AU", name: "Australia", stateLabel: "State", postLabel: "Postcode" },
  { code: "NZ", name: "New Zealand", stateLabel: "Region", postLabel: "Postcode" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);
export const countryName = (code: string) =>
  COUNTRIES.find((c) => c.code === code)?.name || code;
