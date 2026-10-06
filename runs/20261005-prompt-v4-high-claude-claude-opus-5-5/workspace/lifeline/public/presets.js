import { DEFAULT_DESIGN } from './catalog.js';

export const PRESETS = [
  { id: 'birthday', label: 'Birthday', shirt: 'black', design: DEFAULT_DESIGN },
  {
    id: 'couple', label: 'Couple', shirt: 'white',
    design: {
      letter: 'M', name: 'Mia & Leo', tagline: 'Express service since 2019', color: 'pink',
      stops: [
        { name: 'Blue Bottle, 9th Ave', note: 'First date · 2019', transfer: null },
        { name: 'Lisbon', note: 'First trip · 2020', transfer: null },
        { name: 'Our tiny apartment', note: 'Moved in · 2021', transfer: { letter: 'D', color: 'brown' } },
        { name: 'Lake Como', note: 'Said yes · 2025', transfer: null },
        { name: 'The Altar', note: '10.05.2026', transfer: null },
      ],
      next: 'Happily ever after',
    },
  },
  {
    id: 'grandparent', label: 'Grandparent', shirt: 'navy',
    design: {
      letter: '7', name: 'Grandpa Walt’s Line', tagline: 'Eighty years of local service', color: 'yellow',
      stops: [
        { name: 'Kraków', note: '1944', transfer: null },
        { name: 'Ellis Island', note: 'Arrived · 1951', transfer: null },
        { name: 'Hoboken Shipyards', note: '1958–1979', transfer: { letter: 'R', color: 'red' } },
        { name: 'St. Mary’s Church', note: 'Married Rose · 1962', transfer: null },
        { name: 'Bayonne', note: '4 kids · 1963–71', transfer: null },
        { name: 'Great-grandpa', note: '2019', transfer: { letter: 'B', color: 'blue' } },
        { name: 'The Back Porch', note: 'Still here', transfer: null },
      ],
      next: 'The 100 Club',
    },
  },
  {
    id: 'grad', label: 'Graduate', shirt: 'heather',
    design: {
      letter: 'A', name: 'The Ava Express', tagline: 'Class of 2026', color: 'teal',
      stops: [
        { name: 'Lincoln Elementary', note: '2013', transfer: null },
        { name: 'Robotics Club', note: 'Captain · 2022', transfer: null },
        { name: 'Westview High', note: 'Graduated · 2022', transfer: null },
        { name: 'UC Santa Cruz', note: 'B.S. · 2026', transfer: { letter: 'G', color: 'lime' } },
      ],
      next: 'The real world',
    },
  },
  {
    id: 'blank', label: 'Start blank', shirt: 'white',
    design: {
      letter: '', name: '', tagline: '', color: 'green',
      stops: [
        { name: '', note: '', transfer: null },
        { name: '', note: '', transfer: null },
        { name: '', note: '', transfer: null },
      ],
      next: '',
    },
  },
];
