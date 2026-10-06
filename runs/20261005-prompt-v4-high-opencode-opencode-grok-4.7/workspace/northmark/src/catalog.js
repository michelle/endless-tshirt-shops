export const SKU = "GLOBAL-TEE-GIL-2000";

export const COLORS = [
  { id: "black", name: "Black", hex: "#141414", ink: "light" },
  { id: "navy blue", name: "Navy", hex: "#1b2c4e", ink: "light" },
  { id: "charcoal", name: "Charcoal", hex: "#3c3c3c", ink: "light" },
  { id: "royal blue", name: "Royal", hex: "#1e4fbe", ink: "light" },
  { id: "red", name: "Red", hex: "#9c2e2e", ink: "light" },
  { id: "sand", name: "Sand", hex: "#d8c4a2", ink: "dark" },
  { id: "white", name: "White", hex: "#f4f1ea", ink: "dark" },
  { id: "sport grey", name: "Sport grey", hex: "#9b9b9b", ink: "dark" },
];

export const SIZES = [
  { id: "s", name: "S", price: 4400, note: "width 18\u2033" },
  { id: "m", name: "M", price: 4400, note: "width 20\u2033" },
  { id: "l", name: "L", price: 4400, note: "width 22\u2033" },
  { id: "xl", name: "XL", price: 4400, note: "width 24\u2033" },
  { id: "2xl", name: "2XL", price: 5000, note: "width 26\u2033" },
  { id: "3xl", name: "3XL", price: 5600, note: "width 28\u2033" },
  { id: "4xl", name: "4XL", price: 5600, note: "width 30\u2033" },
  { id: "5xl", name: "5XL", price: 5600, note: "width 32\u2033" },
];

export const COUNTRIES = [
  ["AT", "Austria"],
  ["BE", "Belgium"],
  ["HR", "Croatia"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["DK", "Denmark"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GR", "Greece"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IE", "Ireland"],
  ["IT", "Italy"],
  ["LV", "Latvia"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MT", "Malta"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ES", "Spain"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TR", "Turkey"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY",
];

export function colorById(id) {
  return COLORS.find((c) => c.id === id) || null;
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || null;
}

export function countryName(code) {
  return COUNTRIES.find((c) => c[0] === code)?.[1] || code;
}

export const SHIPPING_METHOD = "Standard";
