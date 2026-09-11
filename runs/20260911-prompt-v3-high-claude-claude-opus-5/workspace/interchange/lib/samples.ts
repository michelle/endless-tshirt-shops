import { Spec, sanitizeSpec } from "./spec";

export type Sample = { id: string; name: string; blurb: string; spec: Spec };

export const SAMPLES: Sample[] = [
  {
    id: "rosa",
    name: "A life so far",
    blurb: "Three lines, one interchange where work and childhood met.",
    spec: sanitizeSpec({
      title: "THE ROSA NETWORK",
      subtitle: "SERVICE MAP 1991 - PRESENT",
      motto: "mind the gap",
      garment: "black",
      variant: 0,
      lines: [
        { name: "Growing Up Line", color: "#E8453C", stations: [
          { label: "Lisbon", note: "1991" },
          { label: "Grandma's Kitchen" },
          { label: "Public Library", note: "1999" },
          { label: "First Guitar", note: "2004", major: true },
          { label: "Leaving Home", note: "2009" },
        ]},
        { name: "Work Line", color: "#38B6E0", stations: [
          { label: "Night Shifts", note: "2010" },
          { label: "First Guitar" },
          { label: "The Big Move", note: "2014" },
          { label: "Started The Studio", note: "2019" },
          { label: "Still Building", note: "now" },
        ]},
        { name: "Love Line", color: "#F2A93B", stations: [
          { label: "A Bad Idea", note: "2012" },
          { label: "The Big Move" },
          { label: "Sam", note: "2016" },
          { label: "Two Cats", note: "2021" },
        ]},
      ],
    }),
  },
  {
    id: "couple",
    name: "Ten years, two people",
    blurb: "An anniversary map. The Detours line rejoins at One Apartment.",
    spec: sanitizeSpec({
      title: "MARCUS & JUNE",
      subtitle: "TEN YEARS, ONE NETWORK",
      motto: "no replacement service",
      garment: "white",
      variant: 1,
      lines: [
        { name: "The Us Line", color: "#E3559B", stations: [
          { label: "A Rooftop In Athens", note: "2015" },
          { label: "Long Distance", note: "2016" },
          { label: "One Apartment", note: "2018", major: true },
          { label: "The Dog", note: "2020" },
          { label: "Married", note: "2023" },
        ]},
        { name: "Detours", color: "#4A6BE8", stations: [
          { label: "The Big Argument" },
          { label: "One Apartment" },
          { label: "Therapy, Honestly", note: "2019" },
          { label: "Better", note: "now" },
        ]},
      ],
    }),
  },
  {
    id: "dad",
    name: "A sixtieth birthday",
    blurb: "Four lines. The gift that takes twenty minutes and lands for years.",
    spec: sanitizeSpec({
      title: "DAD AT SIXTY",
      subtitle: "ALL LINES RUNNING ON TIME",
      motto: "still no delays",
      garment: "navy blue",
      variant: 2,
      lines: [
        { name: "Early Years", color: "#E8453C", stations: [
          { label: "Dundee", note: "1966" }, { label: "Paper Round", note: "1978" },
          { label: "The Blue Cortina", note: "1984" }, { label: "Art School", note: "1986", major: true },
          { label: "London", note: "1989" }]},
        { name: "Family", color: "#F2A93B", stations: [
          { label: "Meeting Mum", note: "1991" }, { label: "London" },
          { label: "Me", note: "1995" }, { label: "Ellie", note: "1998" },
          { label: "The Allotment", note: "2011" }]},
        { name: "Work", color: "#37B98A", stations: [
          { label: "Art School" }, { label: "First Agency", note: "1990" },
          { label: "Redundancy", note: "2002" }, { label: "His Own Shop", note: "2004" },
          { label: "Retired", note: "2026" }]},
        { name: "Obsessions", color: "#9B6BE8", stations: [
          { label: "Vinyl" }, { label: "Bad Puns" },
          { label: "Sourdough", note: "2020" }, { label: "Birdwatching" }]},
      ],
    }),
  },
  {
    id: "startup",
    name: "The company so far",
    blurb: "Team shirts that nobody throws away. Every founding story has stops.",
    spec: sanitizeSpec({
      title: "FIVE YEARS OF KILN",
      subtitle: "EMPLOYEE NO. 7 EDITION",
      motto: "ship it",
      garment: "forest green",
      variant: 3,
      lines: [
        { name: "The Product", color: "#C9D93F", stations: [
          { label: "A Bad Prototype", note: "2021" }, { label: "First Paying User", note: "2022" },
          { label: "The Rewrite", note: "2023", major: true }, { label: "Ten Thousand", note: "2025" }]},
        { name: "The Company", color: "#38B6E0", stations: [
          { label: "Two Laptops" }, { label: "The Rewrite" },
          { label: "Series A", note: "2024" }, { label: "An Actual Office", note: "2025" },
          { label: "Still Here", note: "now" }]},
      ],
    }),
  },
];

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);
