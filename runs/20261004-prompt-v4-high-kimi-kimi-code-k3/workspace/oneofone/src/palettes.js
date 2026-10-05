'use strict';

// Curated ink palettes. Each is tuned to read well on its shirt color under DTG.
const PALETTES = {
  solar: {
    name: 'Solar Flare',
    shirt: ['black'],
    inks: ['#FFB000', '#FF5E3A', '#E935C1'],
    caption: '#F5F2EA',
  },
  glacier: {
    name: 'Glacier',
    shirt: ['black'],
    inks: ['#4DE3FF', '#5B8CFF', '#B26BFF'],
    caption: '#F5F2EA',
  },
  ghost: {
    name: 'Ghost Mono',
    shirt: ['black'],
    inks: ['#F5F2EA', '#C9C4B8', '#8F8A80'],
    caption: '#F5F2EA',
  },
  ember: {
    name: 'Ember',
    shirt: ['white'],
    inks: ['#C2272D', '#E86A17', '#7A1E3F'],
    caption: '#16161A',
  },
  deepsea: {
    name: 'Deep Sea',
    shirt: ['white'],
    inks: ['#0E4D64', '#137A7F', '#1E3A5F'],
    caption: '#16161A',
  },
  carbon: {
    name: 'Carbon Mono',
    shirt: ['white'],
    inks: ['#16161A', '#3A3A40', '#6B6B72'],
    caption: '#16161A',
  },
};

function palettesForShirt(shirtColor) {
  return Object.entries(PALETTES)
    .filter(([, p]) => p.shirt.includes(shirtColor))
    .map(([id, p]) => ({ id, name: p.name, inks: p.inks }));
}

module.exports = { PALETTES, palettesForShirt };
