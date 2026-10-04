// Curated sample designs used on the home page gallery and as /create prefills.

export const SAMPLES = {
  born: {
    caption: 'The night she arrived',
    spec: {
      t: 'born', d: '1994-05-12', tm: '21:30',
      p: 'Berlin, Germany', la: 52.52, lo: 13.405, tz: 'Europe/Berlin',
      dg: 'for Emma, my whole sky', c: 'black', s: 'm', q: 1,
    },
  },
  met: {
    caption: 'The night we met',
    spec: {
      t: 'met', d: '2019-10-19', tm: '23:45',
      p: 'Paris, France', la: 48.8566, lo: 2.3522, tz: 'Europe/Paris',
      dg: 'one table apart at Le Perreire', c: 'navy blue', s: 'l', q: 1,
    },
  },
  moon: {
    caption: 'One small step',
    spec: {
      t: 'custom', ti: 'The Night We Walked on the Moon',
      d: '1969-07-20', tm: '20:17',
      p: 'Tranquility Base, The Moon', la: 0.674, lo: 23.473, tz: 'UTC',
      dg: 'every sky since has borrowed its light', c: 'black', s: 'm', q: 1,
    },
  },
  brooklyn: {
    caption: 'Welcome to the world',
    spec: {
      t: 'custom', ti: 'The Night You Arrived',
      d: '1990-06-30', tm: '02:15',
      p: 'Brooklyn, New York', la: 40.65, lo: -73.95, tz: 'America/New_York',
      dg: 'born as the sun came up', c: 'asphalt', s: 'l', q: 1,
    },
  },
}

export const GALLERY = ['born', 'met', 'moon']
