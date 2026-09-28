import { DEFAULT_DESIGN, Design } from "./design";

// Example subjects for the landing page gallery; each links into the designer pre-filled.
const ex = (d: Partial<Design>): Design => ({ ...DEFAULT_DESIGN, ...d });

export const EXAMPLES: { design: Design; who: string }[] = [
  {
    who: "for a very good dog",
    design: ex({
      seed: 1234, kind: "moth", palette: "atlas", name: "Biscuit", genus: "Biscuitus", trait: "somnolentus",
      habitat: "The sunny patch on the rug", diet: "Anything dropped, instantly", call: "Woof (at the mailman)",
      status: "CR", marks: ["Tail wags at 40 Hz", "Ears inside out, always", "Believes he is a lap dog"], year: "2019", color: "natural",
    }),
  },
  {
    who: "for a coffee-powered engineer",
    design: ex({
      seed: 7, kind: "butterfly", palette: "monarch", name: "Greg", genus: "Gregus", trait: "caffeinophilus",
      habitat: "Standing desk, 3rd floor", diet: "Cold brew, oat milk", call: "It works on my machine",
      status: "VU", marks: ["Hoodie in all seasons", "Twelve browser tabs minimum", "Fixes printers under protest"], year: "1988", color: "black",
    }),
  },
  {
    who: "for a bookish best friend",
    design: ex({
      seed: 42, kind: "beetle", palette: "jewel", name: "Priya", genus: "Priyopsis", trait: "bibliophilus",
      habitat: "Library, quiet section", diet: "Chai & marginalia", call: "Just one more chapter",
      status: "LC", marks: ["Annotates everything", "Has opinions on fonts", "Returns books on time (rare)"], year: "1996", color: "white",
    }),
  },
  {
    who: "for grandma, the legend",
    design: ex({
      seed: 3301, kind: "butterfly", palette: "rosy", name: "Rosa", genus: "Rosella", trait: "coquus",
      habitat: "Garden, then kitchen", diet: "Tomatoes she grew herself", call: "Have you eaten?",
      status: "EN", marks: ["Never measures anything", "Wins every card game", "Knows everyone's business"], year: "1947", color: "heather",
    }),
  },
  {
    who: "for a night-shift nurse",
    design: ex({
      seed: 90210, kind: "moth", palette: "emperor", name: "Dani", genus: "Danopsis", trait: "nocturnus",
      habitat: "Ward 4B, 7pm to 7am", diet: "Vending machine delicacies", call: "Deep breath for me",
      status: "DD", marks: ["Unbothered by chaos", "Warm hands, cold coffee", "Sleeps while you're awake"], year: "1991", color: "navy",
    }),
  },
  {
    who: "for a cat of great importance",
    design: ex({
      seed: 55501, kind: "beetle", palette: "ember", name: "Mochi", genus: "Mochella", trait: "gloriosus",
      habitat: "Precisely on the keyboard", diet: "Salmon, disdain", call: "Mrrp?",
      status: "NT", marks: ["Knocks things off tables", "Sits in any box", "Judges silently"], year: "2021", color: "military",
    }),
  },
];
