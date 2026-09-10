// Every plate is printed straight onto the garment — there is no white card
// behind it — so each palette ships two ink sets: one for light garments and
// one for dark. `ink` is the line work, `accent` the corolla, `leaf`/`stem`
// the foliage, `wash` the flat under-colour, `faint` the rules and stipple.

export type InkSet = {
  ink: string;
  faint: string;
  leaf: string;
  leafDark: string;
  stem: string;
  accent: string;
  accentDark: string;
  wash: string;
  label: string;
};

export type Palette = {
  id: string;
  name: string;
  blurb: string;
  onLight: InkSet;
  onDark: InkSet;
};

export const PALETTES: Palette[] = [
  {
    id: 'herbarium',
    name: 'Antique Herbarium',
    blurb: 'Sepia ink and pressed-leaf green, as if lifted from an 1840s folio.',
    onLight: {
      ink: '#2f2a20', faint: '#8c8271', leaf: '#6d7c4e', leafDark: '#4a5733',
      stem: '#5c6640', accent: '#a8574a', accentDark: '#7d3a31', wash: '#c9b98f',
      label: '#3a3228',
    },
    onDark: {
      ink: '#efe6d2', faint: '#a49a84', leaf: '#b7c98d', leafDark: '#8fa268',
      stem: '#a3b47c', accent: '#e59a86', accentDark: '#c9705c', wash: '#7a6f52',
      label: '#f4ecda',
    },
  },
  {
    id: 'cyanotype',
    name: 'Cyanotype',
    blurb: 'Anna Atkins blue — the specimen as a photogram, not a drawing.',
    onLight: {
      ink: '#173a5e', faint: '#5b7fa6', leaf: '#2d5f8a', leafDark: '#12324f',
      stem: '#1f4a72', accent: '#3f88b8', accentDark: '#1b4f7a', wash: '#9dc2dc',
      label: '#12314f',
    },
    onDark: {
      ink: '#cfe6f7', faint: '#7fa8c6', leaf: '#8fc3e6', leafDark: '#5d97bf',
      stem: '#a6d0ec', accent: '#dff1ff', accentDark: '#8dc0e0', wash: '#3d6d92',
      label: '#e6f3fd',
    },
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    blurb: 'A night-flowering variety: moth-white corolla, deep bottle green.',
    onLight: {
      ink: '#1e2a26', faint: '#6f8078', leaf: '#3d5a4a', leafDark: '#22382c',
      stem: '#2f4a3b', accent: '#8c6f9e', accentDark: '#5b446b', wash: '#b3c2b1',
      label: '#1e2a26',
    },
    onDark: {
      ink: '#e8f1e6', faint: '#8fa89a', leaf: '#7fb392', leafDark: '#4f7f63',
      stem: '#6ea184', accent: '#d6bdea', accentDark: '#a487bd', wash: '#3c5647',
      label: '#eef6ec',
    },
  },
  {
    id: 'foxglove',
    name: 'Foxglove',
    blurb: 'Hand-tinted plate: magenta bells over grey-green leaves.',
    onLight: {
      ink: '#33272f', faint: '#8d7d87', leaf: '#77896b', leafDark: '#4f6046',
      stem: '#6a7a5f', accent: '#b3466f', accentDark: '#7d2c4c', wash: '#e0aec4',
      label: '#33272f',
    },
    onDark: {
      ink: '#f3e7ec', faint: '#ab97a2', leaf: '#b5c79f', leafDark: '#8ba179',
      stem: '#a8ba93', accent: '#f08cb2', accentDark: '#c4628a', wash: '#7a3c56',
      label: '#f7edf1',
    },
  },
  {
    id: 'ochre',
    name: 'Ochre Field',
    blurb: 'High-summer palette — burnt ochre, straw, and dry olive.',
    onLight: {
      ink: '#3b2f1e', faint: '#9a8a66', leaf: '#8a8749', leafDark: '#5f5f2e',
      stem: '#7b7940', accent: '#c8792a', accentDark: '#8f5217', wash: '#dcc07a',
      label: '#3b2f1e',
    },
    onDark: {
      ink: '#f2e6cd', faint: '#ab9d80', leaf: '#cfc684', leafDark: '#a29a5f',
      stem: '#c1b877', accent: '#f0aa5c', accentDark: '#c4802f', wash: '#7d6533',
      label: '#f6ecd8',
    },
  },
  {
    id: 'verdigris',
    name: 'Verdigris',
    blurb: 'Oxidised copper and slate — cool, architectural botany.',
    onLight: {
      ink: '#23343a', faint: '#7a949a', leaf: '#3f7f78', leafDark: '#255852',
      stem: '#356b66', accent: '#c26b4e', accentDark: '#8e4630', wash: '#9fc8c1',
      label: '#23343a',
    },
    onDark: {
      ink: '#dff0ee', faint: '#8fabab', leaf: '#7fc6ba', leafDark: '#54998e',
      stem: '#6db6ab', accent: '#f0977a', accentDark: '#c26b4e', wash: '#2f5f59',
      label: '#e8f6f4',
    },
  },
  {
    id: 'monochrome',
    name: 'Engraver',
    blurb: 'Pure line engraving. No colour at all — just weight and hatching.',
    onLight: {
      ink: '#1b1b1b', faint: '#8a8a8a', leaf: '#3a3a3a', leafDark: '#1b1b1b',
      stem: '#2b2b2b', accent: '#1b1b1b', accentDark: '#000000', wash: '#c4c4c4',
      label: '#1b1b1b',
    },
    onDark: {
      ink: '#f2f2f2', faint: '#9a9a9a', leaf: '#d8d8d8', leafDark: '#a8a8a8',
      stem: '#e0e0e0', accent: '#ffffff', accentDark: '#c8c8c8', wash: '#6a6a6a',
      label: '#f6f6f6',
    },
  },
  {
    id: 'coral',
    name: 'Reef Coral',
    blurb: 'Tropical field notebook — coral, teal, and unbleached paper.',
    onLight: {
      ink: '#2c3742', faint: '#7f8f9c', leaf: '#2f8a7e', leafDark: '#1d5f56',
      stem: '#2a7a70', accent: '#e2664f', accentDark: '#a83f2c', wash: '#f2b8a3',
      label: '#2c3742',
    },
    onDark: {
      ink: '#eaf2f5', faint: '#93a6b1', leaf: '#6fd0bf', leafDark: '#3f9c8c',
      stem: '#62c2b1', accent: '#ff9377', accentDark: '#d4664c', wash: '#8a4433',
      label: '#f0f7f9',
    },
  },
];

export const PALETTE_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p]));
