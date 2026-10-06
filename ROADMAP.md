# Roadmap

One chat session per task. Start a session with a line like
"013 session 2: polish Floe in Blender" and read this file first.
Update the status column and the notes at the end of every session.

The rule behind the order: the scroll sequence decides what every guitar
has to hold up to, so it gets locked on Floe and approved before the other
six are built to that standard.

| # | Session | Status |
|---|---------|--------|
| 0 | v1: Floe (then called Nimbus) built from the Telecaster plans, showroom ring, close-up, drawing chapter | Done 2026-09-26 |
| 1 | Name, model names, font and the seven colours | Done 2026-09-30: KVELD |
| 2 | Floe model polish in Blender | Done 2026-09-30: Sam approved the model |
| 3 | Hero v2 | Done 2026-09-30: Breathe on Glass is the page |
| 4 | The scroll sequence on Floe (Sam approves before 5 starts) | Built 2026-09-30, waiting for Sam's approval (session 5 went ahead on Sam's go) |
| 5 | The six remaining guitars, free plans only (see BRIEF-session-5.md) | Built 2026-10-01 overnight, v6 to v11, waiting for Sam's review |
| 6 | Final pass | Started 2026-10-05. All three option sets are picked (2026-10-06): Ink on Paper, Spotlight, Last Light are the real sections. Current page frozen in `versions/v33` |

## 1 · Name, model names, font, colours

- Three brand name options to replace the working name HALDEN (now KVELD), checked so no
  guitar maker already uses them (Axion is taken by Ibanez).
- A set of seven model names. The current ones (Floe, Solstice, Obsidian,
  Sage, Void, Ember, Volt) came from Sam's reference image and can change.
- Three typefaces, none of the usual picks. Sam does not want the current
  serif (Bodoni Moda).
- One colour per guitar. Each guitar's colour will drive its glow in the room.
- Show them the demo-options way: built into the real page behind a URL
  switch, recorded on desktop and phone. No written lists to pick from.
- The chosen name goes into `BRAND` in `blender/build_floe.py`, because it is
  modelled into the headstock as the logo.

## 2 · Floe model polish

The model has to hold up at the distances the sequence will use.

- Wood: higher resolution, visible depth under the clear coat, a proper back
  and edge curves.
- Strings: wound strings that read as wound up close. Nut slots, string
  wraps on the posts.
- Frets with a proper crown, cleaner chrome and nickel, readable logo.
- Name the parts in the GLB so the sequence can aim at them (headstock,
  tuners, nut, frets, neck pickup, bridge pickup, saddles, controls, neck
  plate, back).
- Check with Cycles close-ups from `blender/render_views.py`.

## 3 · Hero v2

- Camera closer: the centre guitar is too far away at the moment.
- Glow, particles, pedestal rings and halo take the selected guitar's colour
  and cross-fade as the ring turns.
- Floor: clean glossy glass reflecting the light. Far fewer circles.
- Bugs seen on Sam's screen (about 1000 x 575 CSS px): the full stop in
  "Drawn from the originals." drops onto its own line (SplitText line mask),
  and "In the workshop" sits on top of the arrows when the window is short.

## 4 · The scroll sequence (the one to approve)

- On scroll the selected guitar lifts out of its pedestal and turns to a good
  angle, then the camera travels along it. Stops: headstock and tuners, nut,
  frets and neck, pickups, bridge and saddles, controls, back and curves.
- Short copy per stop. Keep the drawing chapter and the spec sheet.
- Built as data: a list of camera stops tied to named parts, per guitar. The
  other six only supply their own list and copy. Same foundation for all.
- Switching guitar in the ring switches the sequence content to that model.

## 5 · The six remaining guitars

Changed 2026-09-30: one session for all six, built only from free plans
(Sam is not paying for plans on a concept page). The PRS idea is replaced by
the Music Man Axis, which has free templates. Every body gets at least three
changes of its own on top of the KVELD headstock, markers and logo, so none
reads as a copy. Full brief, sources and specs: `BRIEF-session-5.md`.

| KVELD | Based on | Plans | Status |
|---|---|---|---|
| Sedge | Music Man Axis | Electric Herald free templates | Done 2026-10-01, v10 |
| Scree | Gibson SG | Electric Herald free templates | Done 2026-10-01, v8 |
| Moss | Fender Jazzmaster | Electric Herald free templates | Done 2026-09-30, v7 |
| Fjord | Gibson ES-335 | Electric Herald free templates | Done 2026-10-01, v9 |
| Rowan | Gibson Les Paul | Electric Herald free templates | Done 2026-10-01, v11 |
| Heath | Fender Stratocaster | Electric Herald free templates | Done 2026-09-30, v6 |

## 6 · Final pass

- Loading seven detailed models without a slow page: the centre one at full
  detail, the rest light until they turn to the front. Mesh compression.
- Phone polish. The drawing chapter is too small on a phone (turn it upright).
- Standalone file if wanted, following the CLAUDE.md rules for hosted assets.

## Notes carried between sessions

- Run the site: `python3 tools/serve.py 8013 site` (launch.json entry `kveld-site`). Model viewer: `/inspect.html`.
  Use serve.py, not `python3 -m http.server`: the plain server lets Chrome keep old CSS and JS modules, and after an
  edit the page loads as a mix of old and new files (2026-10-06). Any frozen copy: `python3 tools/serve.py 8024 versions/v24`.
- The in-app Browser pane has been hidden, which stops WebGL rendering there.
  Check the page with headless Chrome instead (see the headless-webgl-checks
  project memory).
- Stills and reels from each session go in `media/`.
- Versions (changed 2026-10-06, Sam's rule): the project is a git repository and a version is
  a tag on `main`. A new tag only for something big, a new section or a redesign, not for each
  round of fixes: commit those, don't tag them. To undo a risky change, go back to the last
  commit. The `versions/` folder is gone. Every `versions/vN` named in the notes below maps to
  a tag: old v1 = `v1`; old v2 to v4 = `v2`; old v5 = `v3`; old v6 to v26 = `v4`; old v27 to
  v33 = `v5`. Side tags: `alt/hero-options` (old v4-hero-options), `alt/scree-1961-guard`
  (old v19), `alt/unpicked-options` (old v29), `alt/dark-hero` (old v30).
- Keep `teach/journal.md` going (teachable-build skill, journal mode): short
  entries for directions Sam picks, new techniques, turns and fixes.
- Session 1 picked KVELD: Panchang + Martian Mono, models Floe, Sedge, Scree,
  Moss, Fjord, Rowan, Heath, one colour each in `site/src/data.js`. The room
  already takes the centre guitar's colour, so hero v2 only has to tune it
  (the dark blue of Scree glows weaker than the warm colours). The ORIEL and
  SORREL options were removed; they survive in the reels in `demo/`.
- Nimbus was renamed Floe everywhere, including the files: `build_floe.py`,
  `floe.glb`, `floe.json`. The v1 files are in `versions/v1/`.
- Session 2 so far: z-fighting fixed (tuner housings, dots, stripe, ferrules,
  post slots, logo), grain normal map under the clear coat, finish pass on
  every material, product-studio light in the viewer (`site/src/guitar-look.js`,
  shared with the showroom). Frozen in `versions/v3/`. Sam approved Floe as
  it is ("it's perfect... feels like a real product"). Wound strings, nut
  slots, string wraps and higher resolution wood were not done: pick them up
  in session 4 only if a camera stop gets close enough to need them.
- Hero v2: the per-guitar glow is already in (session 1). What is left is the
  camera distance, the glass floor and the two layout bugs. Show it as
  demo-options recordings.
- Session 3 done: Sam mixed two options. Breathe's close camera and zoom with
  Black Glass's mirror floor, now built into showroom.js (`camBase`, `camWide`,
  `breathe()`). Plinths are 0.09 m tall (`PED_TOP`), the floor rings and the
  track line are gone, the halo sits round the guitar, the plinth ring is soft
  under the centre guitar. The model name and View guitar sit on the right edge
  on desktop. Before: `versions/v3/` and `versions/v4-hero-options/` (all four
  options, `?hero=step|glass|breathe|breatheglass`). After: `versions/v4/`.
  Reels in `demo/hero/`, final in `media/s3-hero-v2-*.mp4`.
- For session 4: the sequence starts from the close camera, so the lift out of
  the plinth begins from a guitar already filling the frame. The guitar now
  stands lower (base at 0.118 m), and the close-up targets moved down to match.
- Session 4 built the walk: lift, seven stops (headstock, nut, neck, pickups,
  bridge, controls, back), then Floe laid flat for the drawing chapter
  (upright on phones). Stops are data in `site/src/stops.js`, the engine is
  `site/src/sequence.js`. Maquettes run a three-stop workshop walk in their own
  colour. Wound strings now show their winding (shader). Nut slots and a higher
  resolution wood texture were not needed at these distances. Before:
  `versions/v4/`. After: `versions/v5/`. Reels: `media/s4-walk-desktop.mp4`
  and `-phone.mp4`. For guitars 2 to 7: write a stops list with the same part
  names where the parts exist, then tune `turn` per stop until no chrome or
  brass blows out under the key light.


- Session 5, how a guitar is built now (Heath was the first):
  1. Plans in `reference/<id>/` (free Electric Herald PDFs, downloaded with Sam's OK).
     `tools/plan_kit.py` reads them (honours the SVG transforms, several sheets
     come out flipped without them). `tools/extract_<id>.py` writes
     `reference/<id>/parsed/<id>.json` in the model frame.
  2. `blender/kveld_kit.py` = Floe's builders, moved out unchanged (Floe rebuilds
     byte-identical). `blender/kveld_parts.py` = the house parts: body_shell (CDT
     caps, carves/contours as height functions), neck loft, fretboard, frets,
     KVELD markers, nut, tuners, strings, logo, knob, switches, strap, edge jack,
     neck plate, single coil, vintage trem. Six-in-line and 3+3 headstock outlines.
  3. `blender/build_<id>.py` -> `site/assets/models/<id>.glb` + `site/assets/data/<id>.json`.
  4. Check: `blender -b blender/<id>.blend -P blender/render_check.py -- <dir> "name:Part+Part:dx,dy,dz:dist[:lens[:ax,ay,az]]"`
     for Cycles close-ups; `PLAN=... OUT=media/plan-vs-<id>.png blender -b blender/<id>.blend -P tools/plan_overlay.py`.
  5. Site: `data.js` entry gets `real: true, model: 'assets/models/<id>.glb'`;
     `Showroom.load` loads the centre guitar first, swaps the rest in as they land.
     Stops in `stops.js`. `GUITAR=<ring index> node tools/stills.mjs 1000x575 <label> 2.5 4.3 ...`
     for stills (media/checks/), `GUITAR=<i> node tools/tune_turns.mjs <id>` measures
     blown-out pixels per stop across turns.
  6. Freeze `site/` to `versions/vN/`, reel with the demo-options `record.mjs`
     (plan in the journal) into `media/s5-<id>-walk-desktop.mp4`.
- Heath (2026-09-30): v6. Horns 10.3 mm (bass) and 7.2 mm (treble) shorter and
  rounder, seven-screw parchment three-ply guard without controls, controls on a
  curved chrome plate, jack on the rim. 91% of the outline within 0.033 in of
  the Strat body sheet (`media/plan-vs-heath.png`), the rest is the horns.
- Moss (2026-09-30): v7. `BoltOnNeck` in kveld_parts.py now builds the whole
  Fender-pattern neck for a bolt-on (Heath predates it and keeps its own copy).
  Offset softened (treble waist +7 mm, drawn up), horns 11 mm / 6 mm shorter,
  rhythm circuit dropped for one chrome plate (toggle, volume, tone), guard
  four-ply tortoise round the pickups only, jack in the rim. Contours judged
  (the sheet says it leaves them out). Overlay `media/plan-vs-moss.png`.
- Scree (2026-10-01): v8. First set neck: `SetNeck` in kveld_parts.py (neck
  built straight, pitched about the joint; 3+3 head pitched from the nut with a
  black veneer, bone logo; bound board). Also `pickup_ring`, `humbucker`,
  `tune_o_matic`, `stopbar`. Body from the 1:1 template, strings/bridge from the
  plans sheet (tied by the pickups). Horns blunted 6 and 8 mm, waists filled out
  6.6 mm, small three-ply guard, bevels along the drawn lines. Overlay
  `media/plan-vs-scree.png`.
- Fjord (2026-10-01): v9. Arched top from the sheet's contour map (`ArchMap`
  in kveld_parts.py: nested loops -> height grid), back at 85% (judged),
  `body_shell` now takes `bind=`, `rim_mat=`, `top_holes=`; `kveld_fhole`,
  `hole_walls`, `figured_top_png` (burst + flame), SetNeck `heel_drop`.
  Scale 24.54 in from the drawn frets. Horns 8.5 mm, sound holes ours, slim
  floating guard, rim jack. Overlay `media/plan-vs-fjord.png` (95.8% within 0.033 in).
- Sedge (2026-10-01): v10. BoltOnNeck with `width_k` (1.625 nut), maple
  board, 22 frets, 10 in radius. Carve judged from the drawn carve line (0.3 in),
  maple cap edge via `bind=(..., bind_back=False)`, amber flame
  (`figured_top_png` flame reworked: broad, uneven, bookmatched), `hardtail`
  string-through, `open_humbucker`. Horns 10/7 mm, waists 5 mm.
- Rowan (2026-10-01): v11. Carve from the isolines (12 lines at 1/32 in, read
  off the sections), heights between them ours (`levels ** 0.8`), cherry burst
  flame, zebra open coils in cream rings, knobs on an arc, floating guard.
  Also in this last round: `seat_humbucker` raises each humbucker to 0.13 in
  under the strings (Scree and Fjord rebuilt with it, their reels re-recorded),
  the controls stop aims at the knobs on Fjord and Rowan.
- Session 5 wrap: everything is in `versions/v11/`. Reels
  `media/s5-<id>-walk-desktop.mp4`, overlays `media/plan-vs-<id>.png`, all six
  in the room `media/s5-six-guitars.png`. Open for session 6 (final pass): page
  weight (seven GLBs, 3.8 to 5.3 MB each, about 32 MB: compress), the drawing
  chapter still plots Floe only (each guitar has its `<id>.json` ready), phone
  reels for the six, Sam's review of the KVELD changes and finishes.
- Review round 1 (2026-10-01, Sam on Sedge): smooth body normals in
  `body_shell` (all six rebuilt), Sedge's neck joint now follows the drawn heel
  line (pocket floor 7.61 in, board from 7.07 in), jack centred on the rim.
  Frozen in `versions/v12/`. The viewer `inspect.html?g=<id>` shows all seven.
- Review round 2 (2026-10-01, Sam on Sedge and Scree): carved and bevelled
  tops are now sampled on a fine grid and softened (`SmoothGrid`,
  `contour_grid`, `grid_top` in body_shell): no jagged highlight on Sedge's
  carve, no staircase on Scree's bevels. Set necks: the 3+3 outline is split
  at its tip (no flat end cap), starts at the nut width (no step at the nut),
  the veneer is filled from an evenly spaced outline (it was missing on the
  treble side), and the tenon stays below the top (it showed through Scree's
  guard). Scree, Fjord, Rowan, Sedge rebuilt. Frozen in `versions/v13/`.
- Review round 3 (2026-10-01, Sam on Scree): bevels rebuilt as an even band
  along the rim (`edge_band_grid`), its width taken from the drawn lines and
  smoothed, fading out at the neck joint and the horn tips; horn tips rounded
  to about 0.2 in (they were still nearly pointed); corners at the neck joint
  rounded; 3+3 head sections run to the tip, posts moved in so the housings sit
  under the head. Frozen in `versions/v14/`.
- Review round 4 (2026-10-01, Sam on Scree): the bevel band now only runs
  along the stretch of rim its drawn line runs beside, eases out over 1 in at
  each end, and gets shallower as it narrows (no lumps past the line ends, no
  step down the rim). Depth is the deepest any banded rim point gives, so no
  cliff down the middle of a horn. The 3+3 headstock is now a plate cut from
  its outline with true rounded edges (lofted, its edges came out faceted),
  with a rounded nose hidden in the nut and board and a volute behind the nut
  that carries the neck into it. Scree, Fjord, Rowan rebuilt. Frozen in
  `versions/v15/`.
- Review round 5 (2026-10-01, Sam on Scree): the back of the 3+3 head was two
  shapes crossing (a long tongue with a crease). The neck loft now morphs,
  section by section, into the head plate's own cross-section (a hair bigger),
  then slips inside it, so the neck's back becomes the head's back along a
  tangent; the plate's texture is laid out like the loft's so the grain runs
  on. The first pair of tuner housings hung 0.15 in over the narrow end of the
  head and looked to float: each housing now sits 0.1 in inside the edge.
  Scree's top is meshed in rows parallel to the rim for 1.8 in in
  (`top_rings`), so the bevels no longer show a fine sawtooth. Scree, Fjord,
  Rowan rebuilt. Frozen in `versions/v16/`.
- Round 5b: two small spots either side of the volute were the plate's
  rounded back showing through the neck just past the nut (up to 0.01 in). The
  neck section is fuller toward the head (carve 4.6); `DBG_CONTAIN=1` on a
  set-neck build now lists any plate point outside the neck (none on Scree,
  Fjord, Rowan). Frozen in `versions/v17/`.
- Round 5c (Sam: does the guard match the reference? its top shows from the
  back). The small guard is ours (the plan draws the big batwing), and its two
  top corners hung up to 0.2 in past the body into the cutaways, over the
  bevel. Two causes: the guard's own corners, and the cutaway bevels next to
  the neck coming out 0.65 in wide where the plan draws 0.2 to 0.3. That was a
  bug: `resample_poly` closed each open bevel line, adding a chord straight
  across the body. Lines are now resampled open (`closed=False`), and matched
  only to rim they face and nearly as near as the nearest. Bevels elsewhere are
  unchanged. The guard's top corners now follow the flat round the neck ring
  (inside the body, 0.005 in of bevel under its edge, 0.13 in from the ring).
  `DBG_GUARD=1` and `DBG_BAND=1` print these checks. Frozen in `versions/v18/`.
- Round 6 (Sam on Scree: compare the guard with the reference; is the neck
  joint right?). Reference sheets rendered to `media/reference/` (personal
  use, not for publishing). Guard: Sam chose the 1961-62 SG small guard; it is
  now that sheet's outline and five holes (`tools/extract_sg_guard.py`,
  sg.json `small_guard`), its tab centred between the pickups, the rings on the
  body beside it. It fits inside the body and clear of all hardware; its top
  corner bends 0.012 in onto the start of the cutaway bevel. Joint: the neck
  stood 0.1 in proud of the body's end on each side (I had rounded the body's
  joint corners; the neck was also a touch wide). The plan's corners are back,
  the neck is exactly the body's end width (+-1.06 in), and the neck heel the
  SG plans label is in. Frozen in `versions/v19/`.
- Round 6b (Sam): back to v18 (his call): the guard round both pickups and the
  v18 neck joint (no heel, joint corners rounded). The guard is redrawn to sit
  balanced: mirror-symmetric about the strings (within 0.002 in), 0.21 in all
  round the bridge ring and the same both sides of the neck ring, its top
  corners following the cutaway bevels 0.07 in inside where the top starts to
  fall, its sides echoing the body's waist (a tenth of the body's change in
  width), smoothed without shrinking (Taubin), six mirrored screws. Inside the
  body, flat under its whole edge. v19 (1961 guard, heel) stays in
  `versions/v19/` if wanted again. Frozen in `versions/v20/`.
- Review round 7 (Sam on Moss): (1) the body outline had a wedge cut out of
  it beside the neck: `tools/extract_jm.py` removed the neck pocket with a box
  a little wider on the treble side, which also took the body's real edge
  beside the neck, and the closing chord ran diagonally across the end (the
  white wedge, and why the neck plate hung over nothing). The pocket is now cut
  at its own width and the edge put back as drawn (the treble cutaway meets
  the pocket wall at x 8.07, the wall is the body's edge to the end). The neck
  plate sits flat on the back; edge radius 0.075 in across the end; the square
  treble end corner eased, clear of the neck. (2) The comfort contours are rim
  bands now (`edge_band_grid` with `power`, `nearest`, `w_fn`): the arm cut
  from its line, rolling from level at the top to full depth at the rim; the
  belly cut as one smooth swell of width along the bass rim (its line started
  on the horn, so the band stopped and restarted: the zigzag). Caps meshed in
  rim-parallel rows on both faces (`top_rings`, `back_rings`). Frozen in
  `versions/v21/`.
- Round 7b (Sam: Moss looks good, clean the edges, global pass): the edge
  radius near the neck switched from 0.3 to 0.12 in at a hard boundary, so the
  roundover stepped on both cutaways. `r_fn` now grows smoothly from 0.075 in
  at the neck to the full 0.3 in over the next inch of rim. Global pass in the
  page (front, back, both sides, horns, head, bridge, vibrato, controls): no
  other defects found. Frozen in `versions/v22/`.
- Round 8 (Sam on Fjord): the floating comma guard (ours, not on the plan) ran
  over the toggle, whose lever came up through it: removed. The arched top is
  resampled and softened (`SmoothField`) and meshed finer in rim rows. The
  "noise" on the top was the texture: even grain stripes crossed by even flame
  bands made a checkerboard under the clear coat. `figured_top_png(calm=True)`
  (Fjord only; Sedge and Rowan unchanged) draws grain as faint broken lines
  and the flame as irregular bands that come and go. Global pass in the page:
  clean. Frozen in `versions/v23/`.
- Round 9 (Sam on Rowan): the floating comma guard removed (it read as
  Fjord's in another colour). The carve resampled and softened
  (`SmoothField`) and meshed finer in rim rows: the rim and binding no longer
  wave. The binding was cut on a diagonal where the neck meets the treble
  cutaway: the body's wall there runs along the neck (|y| 1.07 to 1.11) and
  the neck's side crossed it, 0.007 in outside at x 8 and 0.03 inside at the
  joint. `SetNeck(side_limit=...)` keeps the treble side 0.004 in inside the
  wall, so the binding runs unbroken to the neck. The back control cover,
  drawn freehand round the knobs (a lumpy flat blot), is now a plate along the
  knobs' arc, gloss black, rounded edge, four screws; the toggle cover gets
  two. Global pass: clean. Frozen in `versions/v24/`.
- Round 10 (Sam on Heath, the last one): the "crushed" waist was the rounded
  edge built as a quarter circle ending level against the belly contour,
  which slopes about 37 degrees at the rim: a crease, plus the edge radius cut
  point by point where the body thins to 5/8 in. `body_shell(follow_slope=True)`
  stops each roundover where it is tangent to the cap's slope, and
  `smooth_edge` eases the radius along the rim. The contours are rim bands
  from the drawn lines (`line_widths`: each rim point's distance to the line,
  on its falling side), rolled, so the arm cut no longer reads as a straight
  cut. Edge radius grows smoothly away from the neck (it stepped on both
  cutaways); the two end corners eased and their edge made smaller (the edge
  folded round them: the jagged notch); MIN_T blended with a smooth max.
  `tools/inspect_shots.mjs` is the close-up shot tool (it lived in scratch).
  All seven reviewed. Frozen in `versions/v25/`.
- Round 10b (Sam: Heath's waist still looks distorted, compare with the
  reference): measured along the bass rim (`DBG_RIM=1`), both faces fell a
  full inch within one inch of rim where the arm contour starts (x 1.7 to 0.8),
  because a contour reached full depth as soon as its band was 0.8 in wide.
  Depth now grows with the band's width and is full only at its widest
  (`w_full`, 2.9 in arm, 2.6 in belly), as a cut made on one plane is: the
  same drop now takes about 3 in of rim. Strat sheets rendered to
  `media/reference/` (personal use). Frozen in `versions/v26/`.
- Session 6, first night (2026-10-05). Sam scored the page section by section and
  asked for a v3 pass without waiting for approvals.
  - In the page now: hero v3 (hairline halo, the others dark until the ring
    turns, dark finishes lit harder, copy columns measured against the halo,
    selector on the right edge, headline on phones) and the View guitar sheet
    (per guitar: `site/src/specs.js` plus its json). Before `versions/v27/`,
    after `versions/v28/`, reels `demo/v3/`.
  - Waiting for a pick, each behind a URL switch (the page is unchanged
    without it), all in `versions/v29/`:
    `?draft=ink|stack|dark` (`&g=<id>`) drawing first, `site/src/draft-options.js`, reels `demo/draft/`;
    `?index=wall|stage|bench` section 02, `site/src/index-options.js`, reels `demo/index/`;
    `?footer=light|strings|ticket` footer, `site/src/footer-options.js`, reels `demo/footer/`.
    After a pick: remove the other two and the switch, then bring the winner
    to full quality (reduced motion, resize, a real window).
  - New tools: `tools/product_shots.mjs` + `tools/shot.html` (transparent
    stills into `site/assets/shots/`, needs launch.json `kveld-root` on 8030),
    `tools/room_still.mjs` (the wide room picture). Each `demo/*/record.sh`
    re-records its round; they take a base URL, so a frozen `versions/vN`
    served on its own port can be recorded while `site/` is being edited.
  - Also in the page: the header slides away while scrolling down and comes
    back on the way up (it ran over the chapters' headlines). End of the night
    frozen in `versions/v30/` (v29 plus that and two footer fixes).
  - Still open: page weight (the seven GLBs are now 55.8 MB, not 32), the
    cream drawing chapter still plots Floe only and goes away if drawing first
    is picked, the walk's copy layout and its flat ending (Sam scored the copy
    5: recommendations given, nothing built), prices in specs.js are invented.
- 2026-10-06: Sam took the hero back to the previous version ("there was more
  light, so it feels more premium"). Light, halo, camera, the other guitars and
  the hero layout match `versions/v27` again. The View guitar sheet, the
  sliding header, the copy fixes and the three option sets stay. Hero v3 lives
  on in `versions/v30` and `demo/v3/`. Current page frozen in `versions/v31/`.
  When Sam opens links himself, start the server in his Terminal panel
  (`python3 tools/serve.py 8013 site`): preview servers get stopped
  by the app a few minutes after a turn ends.
- 2026-10-06, later: Sam picked Spotlight for section 02 ("apply this option to
  our actual landing page"). It is the real section: `site/src/spotlight.js`,
  CSS under "02 · the room". Wall, To Scale, the `?index=` switch and the old
  list are removed from `site/`. Changes from the demo: the hold is CSS sticky
  with progress read from the section's own box (a ScrollTrigger pin below the
  pinned room was placed a whole walk too early when reduced motion is on),
  pointing at a name previews it and a click goes to the room, phones get
  seven dots, the stage colour follows each guitar. Also fixed on the way:
  with reduced motion the room's lights never came on. `site/index.html` now
  tags every file with `?v=N` (bump after a change that must show at once).
  Frozen in `versions/v32/`. Still to pick: drawing first, footer.
- 2026-10-06, evening (done from the 014 Lintel chat, at Sam's request, not from a 013 session):
  Sam picked **Ink on Paper** for the drawing ("apply this option for the drawing") and
  **Last Light** for the footer ("apply this footer"), and asked for four hero fixes.
  Before: `versions/v32`. After: `versions/v33`. Cache tag is `?v=35`.
  - `draft-options.js` became `draft.js` with the mode fixed to ink and no switch. The stack
    and dark branches are still in the file, unreachable: cutting them is a cleanup task.
    The cream `#drawings` chapter is removed at boot when the ink chapter runs and stays as
    the reduced motion and no WebGL fallback. Drawings (header) and Scroll (corner) go to
    the inked plan at `DRAFT.hold` (2.2 screens). "Walk the guitar" in the sheet now lands on
    the first stop after the chapter (`DRAFT.len`).
  - `footer-options.js` became `footer.js` with Last Light only. Its styles moved into
    `styles.css`. The plain footer markup in `index.html` is what shows without JS.
  - Hero: the guitar's head ran into the header row and was cut on Moss. `layout()` now fits
    the camera under the header (see README). "Open by appointment" and the coordinates are
    gone from the bottom left. The header has 4 px more air on top.
  - New: a plectrum pointer, `cursor.js`.
  - Checked headless at 2000 x 1148, 1440 x 900 and 390 x 844: no page errors, all seven heads
    clear the header, the ink chapter and the walk run, the footer comes in, the pointer shows
    its three states. Not checked: a real window, reduced motion end to end, a resize mid-walk.
  - Still open from before: page weight, the walk's copy layout, invented prices.
- 2026-10-06, versions: Sam wants the 34 folders folded into acts, kept only at the end state
  of each. Proposed, not done yet (nothing deleted): V1 first page (old v1), V2 KVELD identity
  and the glass hero (old v4), V3 the walk (old v5), V4 seven guitars built and approved (old
  v26), V5 the page around them (old v33). Side copies holding things that are not in that
  line: v4-hero-options (four hero options), v19 (Scree with the 1961 guard), v29 (the
  unpicked options for section 02, drawing and footer), v30 (the darker hero).
- 2026-10-06, night: git set up at Sam's request, for sharing and teaching. Five commits on
  `main`, tagged `v1` to `v5` (see README, "Versions"), plus four `alt/` tags. Local only:
  nothing is pushed, there is no remote. The `versions/` folder was moved to the Trash (not
  erased). Before the repo is made public, check: the Panchang font files in
  `site/vendor/fonts` and `blender/fonts` (Fontshare's licence does not let them be
  redistributed), and the `plan_outline` points inside `site/assets/data/*.json`, which are
  traced from the Electric Herald sheets.

