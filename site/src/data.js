// The seven guitars, in ring order. Index 0 starts in the centre; +1 is the
// next one to its right. Only Nimbus has been built from its drawings so far;
// the rest stand on the ring as workshop maquettes (see standins.js).

export const LINEUP = [
  { id: 'nimbus',   no: '01', name: 'Nimbus',   line: 'Single-cut · Swamp ash · 25.5 in scale',     woods: 'Swamp ash, maple',       pattern: 'Single-cut slab',        real: true },
  { id: 'solstice', no: '02', name: 'Solstice', line: 'Double-cut · Carved flame maple · 25 in scale', woods: 'Flame maple, mahogany',  pattern: 'Double-cut, carved top', shape: 'doublecutCarved' },
  { id: 'obsidian', no: '03', name: 'Obsidian', line: 'Twin horn · Mahogany · 24.75 in scale',       woods: 'Mahogany, rosewood',     pattern: 'Twin horn slab',         shape: 'twinHorn' },
  { id: 'sage',     no: '04', name: 'Sage',     line: 'Offset waist · Alder · 25.5 in scale',        woods: 'Alder, rosewood',        pattern: 'Offset waist',           shape: 'offset' },
  { id: 'void',     no: '05', name: 'Void',     line: 'Semi-hollow · Thinline · 24.75 in scale',     woods: 'Maple laminate',         pattern: 'Semi-hollow thinline',   shape: 'semiHollow' },
  { id: 'ember',    no: '06', name: 'Ember',    line: 'Single-cut · Carved maple cap · 24.75 in scale', woods: 'Maple cap, mahogany', pattern: 'Single-cut, carved top', shape: 'singlecutCarved' },
  { id: 'volt',     no: '07', name: 'Volt',     line: 'Contoured double-cut · Alder · 25.5 in scale', woods: 'Alder, maple',          pattern: 'Contoured double-cut',   shape: 'contoured' },
];
