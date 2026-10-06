// The scroll sequence, as data. Each guitar supplies its own list of camera
// stops; the walk (sequence.js) does the rest the same way for all seven.
//
// A stop aims at named parts of the model, so it survives a rebuild:
//   parts   node names in the GLB (or the maquette groups in standins.js).
//           The camera frames their combined box.
//   aim     where in that box to look, 0..1 per axis (x across, bass at 0;
//           y tail to headstock; z back to front). Default: the centre.
//   radius  how much to fit in the frame, metres. Default: the box's own.
//   view    the camera's direction from the aim point, in the guitar's own
//           frame (x across, bass at -x; y up the neck; z out of the top).
//   roll    camera roll, degrees. Tilts the horizon for the long shots.
//   turn    the guitar's own turn in the room, degrees, so the key light
//           sweeps across it from stop to stop.
//   lens    vertical field of view, degrees.
// Copy: label (the ticker), title (one <em> word takes the guitar's colour),
// text.

export const STOPS = {
  floe: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.42, 0.16, 1], roll: -8, turn: -14,
      title: 'Six in a line, <em>ours</em> alone.',
      text: 'The one part we drew from scratch. A straight bass edge, a slanted tip, six nickel tuners and the name set in black under the finish.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -20,
      title: 'Bone, 1.650 in <em>across</em>.',
      text: 'The strings cross it 0.282 in apart and open out to 0.425 at the bridge, the spacing on the original sheet.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -30, lens: 20,
      title: 'Twenty-one frets, a <em>7.25</em> in radius.',
      text: 'One piece of maple, no separate board. The radius on the drawing is rounder than most necks today and fills the hand.',
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['NeckPickup', 'BridgePickup'], radius: 0.13, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'Two single coils, one <em>slanted</em>.',
      text: 'The bridge pickup sits in the steel plate, tilted ten degrees toward the saddles so the treble strings come through brighter. The neck pickup hides under chrome.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles'], radius: 0.04, view: [0.5, -0.42, 1], roll: -6, turn: 35,
      title: 'Three brass <em>saddles</em>.',
      text: 'Each barrel carries two strings. They run on through the body and out of the back, which is where a lot of the sustain comes from.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], radius: 0.07, view: [0.55, 0.4, 1], roll: 8, turn: 45,
      title: 'Volume, tone and a <em>three-way</em>.',
      text: 'A chrome plate on the treble side with two knurled knobs you can find without looking. The switch picks neck, both, or bridge.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.56, 0.5], radius: 0.22, view: [-0.9, -0.25, -0.6], roll: -4, turn: 205,
      title: '1.75 in of <em>swamp ash</em>.',
      text: 'Turned over: six ferrules where the strings come through, a four-bolt neck plate, and the eighth-inch edge radius that keeps a fifties slab feeling square.',
    },
  ],
  heath: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.42, 0.16, 1], roll: -8, turn: -22,
      title: 'The house headstock, <em>again</em>.',
      text: 'Six in a line with a slanted tip, the same outline and the same nickel tuners as Floe. Every bolt-on KVELD shares it.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -20,
      title: 'Bone, 1.650 in <em>across</em>.',
      text: 'The 1962 neck: 25.5 in scale, a 7.25 in radius, the strings 0.282 in apart at the nut and 0.444 at the bridge.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Twenty-one frets on <em>rosewood</em>.',
      text: 'A slab of Indian rosewood glued flat onto a maple neck, the way the 1962 drawing has it, with KVELD\'s clay dots between the frets.',
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['NeckPickup', 'MiddlePickup', 'BridgePickup'], radius: 0.15, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'Three single coils, one <em>slanted</em>.',
      text: 'Parchment covers on a three-ply guard. The bridge pickup leans ten degrees toward the saddles, measured off the assembled sheet.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles'], radius: 0.05, view: [-1, 0.15, 0.55], roll: -4, turn: 10,
      title: 'A six-screw <em>vibrato</em>.',
      text: 'Six pressed steel saddles on a plate that rocks on six screws, 0.444 in apart. The strings come up through the plate from a steel block below.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], radius: 0.09, view: [0.55, 0.4, 1], roll: 8, turn: 80,
      title: 'Controls on a plate of their <em>own</em>.',
      text: 'One of our changes. The guard no longer carries them: a curved chrome plate follows the lower bout with a five-way switch, volume and two tones.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.26, view: [-0.9, -0.25, -0.6], roll: -4, turn: 205,
      title: '1.75 in of <em>alder</em>, cut for comfort.',
      text: 'Turned over: the belly cut, and through the edge the forearm contour from the front. Both leave 5/8 in at the rim, as the drawing does.',
    },
  ],
  moss: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.42, 0.16, 1], roll: -8, turn: -30,
      title: 'Six in a line, the <em>family</em> head.',
      text: 'The offset body keeps the same headstock as every bolt-on KVELD: straight bass edge, slanted tip, nickel tuners.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -20,
      title: 'Bone, 1.650 in <em>across</em>.',
      text: 'The same Fender-pattern neck as Floe and Heath: 25.5 in scale, a 7.25 in radius, twenty-one frets.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Rosewood over <em>maple</em>.',
      text: 'A rosewood board as on the 1962 sheet, clay dots between the frets, the maple neck finished clear.',
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['NeckPickup', 'BridgePickup'], radius: 0.15, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'Two wide, flat <em>coils</em>.',
      text: 'Single coils wound flat and broad under parchment covers, on a four-ply tortoise guard redrawn round the pickups only.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles', 'Tailpiece'], aim: [0.5, 0.62, 0.6], radius: 0.085, view: [-0.75, -0.5, 1], roll: -4, turn: -15,
      title: 'A bridge that <em>rocks</em>.',
      text: 'Six threaded barrels on a bridge that floats on two posts, and behind it the vibrato plate with its lock and arm, placed where the drawing routes them.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], radius: 0.09, view: [0.55, 0.4, 1], roll: 8, turn: 85,
      title: 'One plate, not <em>two</em> circuits.',
      text: 'Our change: the rhythm circuit is gone. A three-way, volume and tone sit on one chrome plate along the lower horn.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.26, view: [-0.55, -0.2, -1], roll: -4, turn: 205,
      title: 'The offset, <em>softened</em>.',
      text: 'The treble waist filled out 7 mm and drawn up toward the bass one, both horns shortened. 1.75 in of alder in olive.',
    },
  ],
  scree: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.3, 0.1, 1], roll: -6, turn: 7,
      title: 'Three a side, <em>ours</em>.',
      text: 'The set-neck KVELD headstock: one long flare and the slanted tip of the six-in-line, a black veneer, the name inlaid in bone.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -20,
      title: 'Pitched back <em>13</em> degrees.',
      text: 'The head leans back from the nut as the plans draw it, so the strings press down on 1.695 in of bone.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Twenty-two frets, <em>bound</em>.',
      text: 'A rosewood board with cream binding, a 12 in radius and 24.75 in scale. The neck joins the body at the last fret.',
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['NeckPickup', 'BridgePickup'], radius: 0.13, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'Two humbuckers on a <em>small</em> guard.',
      text: 'Nickel covers in black rings, placed 3.52 in apart as the drawing has them. The guard is ours: only round the pickups.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles', 'Tailpiece'], aim: [0.5, 0.62, 0.6], radius: 0.085, view: [0.6, -0.5, 1], roll: -4, turn: -15,
      title: 'A slanted bridge and a <em>stopbar</em>.',
      text: 'The bass end of the bridge sits 0.13 in further back than the treble, measured off the plans. The strings anchor in the bar behind it.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], radius: 0.11, view: [0.55, 0.4, 1], roll: 8, turn: 5,
      title: 'Four knobs and a <em>toggle</em>.',
      text: 'Volume and tone for each pickup, straight into the mahogany where the template puts them, and a three-way on the lower horn.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.26, view: [-0.55, -0.2, -1], roll: -4, turn: 190,
      title: 'Bevels kept, horns <em>blunted</em>.',
      text: 'The edge bevels follow the drawn lines. The horns are rounded off and both waists filled out, so the twin horn reads as ours. 35 mm of mahogany under a slate stain.',
    },
  ],
  fjord: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.3, 0.1, 1], roll: -6, turn: -18,
      title: 'The set-neck head, at <em>17</em> degrees.',
      text: 'The same three-a-side KVELD headstock as Scree, leaning back at the angle this sheet gives.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -60,
      title: 'A 24.54 in <em>scale</em>.',
      text: 'Not the 24.75 of the catalogue: measured off the frets on the drawing, the twelfth sits 12.27 in from this nut.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Joined at the <em>nineteenth</em>.',
      text: 'A bound rosewood board on mahogany, pitched back four degrees, meeting the body at the nineteenth fret.',
    },
    {
      id: 'pickups', label: 'Top', parts: ['NeckPickup', 'BridgePickup', 'SoundHoles'], radius: 0.2, view: [0.34, 0.3, 1], roll: 4, turn: 0,
      title: 'An arch, and holes of our <em>own</em>.',
      text: 'The top rises 0.45 in from the rim, contour by contour from the drawing. The sound holes are ours: one slot, a fine point and a single eye.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles', 'Tailpiece'], aim: [0.5, 0.62, 0.6], radius: 0.085, view: [0.6, -0.5, 1], roll: -4, turn: -23,
      title: 'Bridge and bar on the <em>arch</em>.',
      text: 'The bridge slants as drawn, bass end back, and stands on posts set into the curved top. The strings anchor in the stopbar behind it.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], aim: [0.85, 0.12, 0.5], radius: 0.12, view: [0.55, 0.4, 1], roll: 8, turn: 5,
      title: 'Four knobs on a <em>curve</em>.',
      text: 'Each knob stands square to the arch where it sits. The three-way moved up to the treble horn, the jack into the rim.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.3, view: [-0.55, -0.2, -1], roll: -4, turn: 182,
      title: 'A sea-green <em>burst</em>.',
      text: 'Arched front and back, bound in cream, the colour sprayed dark at the rim and clear over the maple at the centre. Horns rounded fuller than the drawing.',
    },
  ],
  sedge: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.42, 0.16, 1], roll: -8, turn: -22,
      title: 'The house head, in <em>maple</em>.',
      text: 'Six in a line like every bolt-on KVELD. The four-and-two head of the original is the part we never draw.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -20,
      title: '1.625 in, a <em>10</em> in radius.',
      text: 'Narrower and flatter than the vintage necks: the numbers on the sheet, 25.5 in from this nut to the saddles.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Twenty-two on <em>maple</em>.',
      text: 'A maple board with black dots, the board ending just past the last fret where the neck drops into the body.',
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['NeckPickup', 'BridgePickup'], radius: 0.14, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'Open coils on <em>flame</em>.',
      text: 'Two uncovered humbuckers screwed straight into the top, where the drawing puts them. The flame is bookmatched about the centre seam.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles', 'Bridge'], radius: 0.06, view: [-0.75, -0.5, 1], roll: -4, turn: -23,
      title: 'A fixed <em>bridge</em>.',
      text: 'Our choice over the locking vibrato on the sheet: six steel saddles on a heavy plate, the strings coming up through the body.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], radius: 0.11, view: [0.55, 0.4, 1], roll: 8, turn: 37,
      title: 'Volume where it <em>was</em>.',
      text: 'The volume sits where the drawing has its one knob. Tone and a three-way join it, the jack moves into the rim.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.25, view: [-0.55, -0.2, -1], roll: -4, turn: 190,
      title: 'A gentler <em>carve</em>.',
      text: 'The top falls 0.3 in toward the bass edge from the line drawn on the sheet, softer than the original, the maple showing at the rim. Horns and waists reshaped.',
    },
  ],
  rowan: [
    {
      id: 'headstock', label: 'Headstock', parts: ['Tuners', 'Logo'], aim: [0.5, 0.5, 0.6], view: [0.3, 0.1, 1], roll: -6, turn: -43,
      title: 'Three a side, in <em>black</em>.',
      text: 'The set-neck KVELD head again: a black veneer, the name in bone, Floe\'s tuners turned to face outward.',
    },
    {
      id: 'nut', label: 'Nut', parts: ['Nut'], radius: 0.05, view: [0.5, -0.35, 1], roll: 6, turn: -60,
      title: 'Bone over <em>mahogany</em>.',
      text: 'A 1.695 in nut on a mahogany neck, the head leaning back 17 degrees behind it.',
    },
    {
      id: 'neck', label: 'Neck', parts: ['Frets'], aim: [0.5, 0.62, 1], radius: 0.085, view: [1, 0.34, 0.5], roll: -24, turn: -18, lens: 20,
      title: 'Bound rosewood, <em>24.75</em> in.',
      text: 'Twenty-two frets inside cream binding, the neck pitched four degrees to clear the carved top.',
    },
    {
      id: 'pickups', label: 'Top', parts: ['NeckPickup', 'BridgePickup'], radius: 0.16, view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: 'A carve that is half <em>ours</em>.',
      text: 'The twelve contour lines are the drawing\'s, 1/32 in apart in height. How the top rises between them is ours: fuller over the crown, softer at the rim.',
    },
    {
      id: 'bridge', label: 'Bridge', parts: ['Saddles', 'Tailpiece'], aim: [0.5, 0.62, 0.6], radius: 0.085, view: [0.6, -0.5, 1], roll: -4, turn: -31,
      title: 'Posts in the <em>arch</em>.',
      text: 'A slanted bridge and a stopbar where the plan puts their posts, standing in the curve of the maple. Zebra coils sit just under the strings.',
    },
    {
      id: 'controls', label: 'Controls', parts: ['Controls'], aim: [0.85, 0.12, 0.5], radius: 0.13, view: [0.55, 0.4, 1], roll: 8, turn: 5,
      title: 'Four knobs on an <em>arc</em>.',
      text: 'Our layout: the four controls follow the lower bout in one line instead of the square. The toggle stays on the upper bout, the jack in the rim.',
    },
    {
      id: 'back', label: 'Back', parts: ['BackHardware'], aim: [0.5, 0.5, 0.5], radius: 0.3, view: [-0.55, -0.2, -1], roll: -4, turn: 182,
      title: 'Cherry over <em>mahogany</em>.',
      text: 'Under 3/16 in of maple at the rim, 1.845 in of mahogany, as the side view draws it. The cutaway horn is ours: 9 mm shorter and rounder.',
    },
  ],
};

// The six maquettes have no named hardware yet, only the groups standins.js
// gives them. Same walk, shorter, with workshop copy until each is built.
export function workshopStops(info) {
  return [
    {
      id: 'headstock', label: 'Headstock', parts: ['Headstock'], view: [0.42, 0.16, 1], roll: -8, turn: -14,
      title: `The house <em>headstock</em>.`,
      text: `${info.name} shares the KVELD headstock with the rest of the range. The body under it is still a clay maquette.`,
    },
    {
      id: 'pickups', label: 'Pickups', parts: ['Pickups'], view: [0.34, 0.3, 1], roll: 4, turn: -8,
      title: `${info.pattern.split(',')[0]}, <em>in clay</em>.`,
      text: `${info.line}. The pickups and bridge are blocked in to size, waiting for the drawings.`,
    },
    {
      id: 'body', label: 'Body', parts: ['Body'], view: [-0.62, 0.12, -1], roll: -4, turn: 205,
      title: `${info.woods.split(',')[0]}, <em>still to come</em>.`,
      text: `${info.name} is waiting for its drawings. Once it is built from them it gets the same walk as Floe, stop by stop.`,
    },
  ];
}
