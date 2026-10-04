export const SKU = "GLOBAL-TEE-GIL-64000";
export const SHIRT_CENTS = 4800;
export const SHIPPING_HANDLING_CENTS = 150;

export type Ink = "light" | "dark";

export type ShirtColor = {
  id: string;
  name: string;
  hex: string;
  ink: Ink;
  note: string;
};

export const SHIRTS: ShirtColor[] = [
  { id: "black", name: "Black", hex: "#141414", ink: "light", note: "Ivory ink" },
  { id: "navy blue", name: "Navy", hex: "#1A2744", ink: "light", note: "Ivory ink" },
  { id: "charcoal", name: "Charcoal", hex: "#3A3A3A", ink: "light", note: "Ivory ink" },
  { id: "forest green", name: "Forest", hex: "#1C382C", ink: "light", note: "Ivory ink" },
  { id: "white", name: "White", hex: "#F3F0EA", ink: "dark", note: "Ink & copper" },
  { id: "natural", name: "Natural", hex: "#E4D3BC", ink: "dark", note: "Ink & copper" },
  { id: "sand", name: "Sand", hex: "#CDB892", ink: "dark", note: "Ink & copper" },
  { id: "sport grey", name: "Sport grey", hex: "#A3A3A3", ink: "dark", note: "Ink & copper" },
];

export const SIZES = [
  { id: "xs", label: "XS", body: "16½" },
  { id: "s", label: "S", body: "18" },
  { id: "m", label: "M", body: "20" },
  { id: "l", label: "L", body: "22" },
  { id: "xl", label: "XL", body: "24" },
  { id: "2xl", label: "2XL", body: "26" },
  { id: "3xl", label: "3XL", body: "28" },
] as const;

export const COUNTRIES: Array<[string, string]> = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["PT", "Portugal"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["AT", "Austria"],
  ["CH", "Switzerland"],
  ["PL", "Poland"],
  ["CZ", "Czechia"],
  ["GR", "Greece"],
  ["JP", "Japan"],
  ["SG", "Singapore"],
  ["HK", "Hong Kong"],
  ["MX", "Mexico"],
  ["BR", "Brazil"],
  ["KR", "South Korea"],
  ["IN", "India"],
  ["ZA", "South Africa"],
];

export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as const;

export type DesignSpec = {
  name1: string;
  name2: string;
  date: string;
  time: string;
  approximate: boolean;
  place: string;
  region: string;
  lat: number;
  lon: number;
  tz: string;
  line: string;
  color: string;
  size: string;
};

export type Story = DesignSpec & { kicker: string; blurb: string };

export const STORIES: Story[] = [
  {
    kicker: "A first night",
    blurb: "Brooklyn, the rain, two names.",
    name1: "June",
    name2: "Marco",
    date: "2019-06-14",
    time: "21:40",
    approximate: false,
    place: "Brooklyn",
    region: "New York",
    lat: 40.6782,
    lon: -73.9442,
    tz: "America/New_York",
    line: "the rain stopped on Smith Street",
    color: "black",
    size: "m",
  },
  {
    kicker: "She arrived",
    blurb: "Lisbon, before sunrise.",
    name1: "Ada",
    name2: "",
    date: "2021-03-08",
    time: "04:12",
    approximate: false,
    place: "Lisbon",
    region: "Lisbon",
    lat: 38.7223,
    lon: -9.1393,
    tz: "Europe/Lisbon",
    line: "she arrived before sunrise",
    color: "natural",
    size: "s",
  },
  {
    kicker: "The year turned",
    blurb: "Melbourne, on the bay.",
    name1: "Sam",
    name2: "Alex",
    date: "2016-12-31",
    time: "23:50",
    approximate: false,
    place: "Melbourne",
    region: "Victoria",
    lat: -37.8136,
    lon: 144.9631,
    tz: "Australia/Melbourne",
    line: "the year turned on the bay",
    color: "navy blue",
    size: "l",
  },
];

export function shirtById(id: string): ShirtColor | undefined {
  return SHIRTS.find((s) => s.id === id);
}

export function countryName(code: string): string {
  return COUNTRIES.find(([c]) => c === code)?.[1] ?? code;
}
