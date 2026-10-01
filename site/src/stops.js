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
