// The words on each guitar's sheet (the View guitar panel). The figures on it
// come from assets/data/<id>.json, which the build writes; these are the parts
// a drawing can't supply: what it is made of, how it is finished, and what
// KVELD changed from the instrument it is drawn after. Prices and build times
// are invented, like the maker: they are there so the page can sell something.
export const SPECS = {
  floe: {
    price: '€2,900', weeks: 12, coils: 'single', family: 'solid', short: 'Two single coils',
    after: 'a 1950s single-cut', claim: 'A slab of ash and one piece of maple, <em>measured</em> before it was made.',
    body: 'Swamp ash, two-piece slab', neck: 'One-piece maple, walnut stripe', pickups: 'Two single coils, the bridge at 10°',
    bridge: 'Three brass saddles, strung through', finish: 'White blonde',
    ours: 'The headstock, the markers and the logo. Every other number is the sheet\'s.',
  },
  sedge: {
    price: '€3,600', weeks: 14, coils: 'humbucker', family: 'solid', short: 'Two open humbuckers',
    after: 'a 1990s carved double-cut', claim: 'A carved double-cut with the <em>flame</em> left bare at the edge.',
    body: 'Flame maple cap on basswood', neck: 'Maple with a maple board, 10 in radius', pickups: 'Two open humbuckers, screwed to the top',
    bridge: 'Hardtail, strung through', finish: 'Amber over flame',
    ours: 'Horns 10 and 7 mm shorter, both waists eased 5 mm, the jack moved into the rim.',
  },
  scree: {
    price: '€3,400', weeks: 14, coils: 'humbucker', family: 'solid', short: 'Two covered humbuckers',
    after: 'a 1961 twin horn', claim: 'Two horns and a <em>bevel</em>, cut from one slab of mahogany.',
    body: 'Mahogany slab, bevelled', neck: 'Set mahogany, bound rosewood', pickups: 'Two humbuckers under nickel covers',
    bridge: 'Slanted bridge and stopbar', finish: 'Slate',
    ours: 'Horns blunted 7 and 13 mm, the waists filled out 7 mm, a small guard round the pickups only.',
  },
  moss: {
    price: '€3,300', weeks: 14, coils: 'single', family: 'solid', short: 'Two wide single coils',
    after: 'a 1958 offset', claim: 'An offset waist that <em>leans</em> into the player.',
    body: 'Alder, contoured', neck: 'Maple with a rosewood slab board', pickups: 'Two wide, flat single coils',
    bridge: 'Floating bridge and vibrato', finish: 'Olive',
    ours: 'Horns 11 and 6 mm shorter, the treble waist drawn up 7 mm, one chrome plate for the controls.',
  },
  fjord: {
    price: '€4,600', weeks: 18, coils: 'humbucker', family: 'semi', short: 'Two covered humbuckers',
    after: 'a 1958 semi-hollow', claim: 'A thinline with an <em>arch</em> on both faces.',
    body: 'Maple laminate, arched, semi-hollow', neck: 'Set mahogany, bound rosewood', pickups: 'Two humbuckers under nickel covers',
    bridge: 'Slanted bridge and stopbar', finish: 'Sea-green burst',
    ours: 'Horns rounded 8 mm fuller, sound holes of our own, the jack in the rim.',
  },
  rowan: {
    price: '€4,200', weeks: 16, coils: 'humbucker', family: 'solid', short: 'Two zebra humbuckers',
    after: 'a 1959 carved single-cut', claim: 'A maple cap carved <em>twelve</em> lines high over mahogany.',
    body: 'Flame maple cap on mahogany', neck: 'Set mahogany, bound rosewood', pickups: 'Two zebra humbuckers, open coils',
    bridge: 'Slanted bridge and stopbar', finish: 'Cherry burst',
    ours: 'The cutaway horn 9 mm shorter, four knobs on one arc, no guard.',
  },
  heath: {
    price: '€3,100', weeks: 12, coils: 'single', family: 'solid', short: 'Three single coils',
    after: 'a 1950s contoured double-cut', claim: 'Three coils, and a <em>contour</em> where the arm rests.',
    body: 'Alder, contoured', neck: 'Maple with a rosewood slab board', pickups: 'Three single coils, the bridge at 10°',
    bridge: 'Six-saddle vibrato', finish: 'Heather purple',
    ours: 'Horns 10 and 7 mm shorter and rounder, the controls on a curved chrome plate.',
  },
};
