// The seven guitars, in ring order. Index 0 starts in the centre; +1 is the
// next one to its right. Only Floe has been built from its drawings so far;
// the rest stand on the ring as workshop maquettes (see standins.js).
//
// Names are Nordic landscape words. `colour` is the guitar's own light: the
// halo, cone, dust, floor pool and page accent take it when the guitar is in
// the centre, and its pedestal ring always glows in it.

export const LINEUP = [
  { id: 'floe',  no: '01', name: 'Floe',  colour: '#9fe3f0', line: 'Single-cut · Swamp ash · 25.5 in scale',       woods: 'Swamp ash, maple',      pattern: 'Single-cut slab',        real: true },
  { id: 'sedge', no: '02', name: 'Sedge', colour: '#e8c14a', line: 'Double-cut · Carved flame maple · 25 in scale', woods: 'Flame maple, mahogany', pattern: 'Double-cut, carved top', shape: 'doublecutCarved' },
  { id: 'scree', no: '03', name: 'Scree', colour: '#5e8cff', line: 'Twin horn · Mahogany · 24.75 in scale',         woods: 'Mahogany, rosewood',    pattern: 'Twin horn slab',         shape: 'twinHorn' },
  { id: 'moss',  no: '04', name: 'Moss',  colour: '#a6d84a', line: 'Offset waist · Alder · 25.5 in scale',          woods: 'Alder, rosewood',       pattern: 'Offset waist',           shape: 'offset' },
  { id: 'fjord', no: '05', name: 'Fjord', colour: '#33c6b3', line: 'Semi-hollow · Thinline · 24.75 in scale',       woods: 'Maple laminate',        pattern: 'Semi-hollow thinline',   shape: 'semiHollow' },
  { id: 'rowan', no: '06', name: 'Rowan', colour: '#ff5a40', line: 'Single-cut · Carved maple cap · 24.75 in scale', woods: 'Maple cap, mahogany', pattern: 'Single-cut, carved top', shape: 'singlecutCarved' },
  { id: 'heath', no: '07', name: 'Heath', colour: '#d65be8', line: 'Contoured double-cut · Alder · 25.5 in scale',  woods: 'Alder, maple',          pattern: 'Contoured double-cut',   shape: 'contoured' },
];
