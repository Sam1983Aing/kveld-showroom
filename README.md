# KVELD showroom (009 Guitars)

A concept landing page for a fictional guitar maker. Seven guitars stand on low
plinths in a curved ring over a black glass floor. The camera sits close on the
centre one, under its halo. When the ring turns, the camera pulls back and drops
low, so the whole ring stands on its reflection for a moment, then pushes in on
the next guitar.

All seven are real models, each rebuilt in Blender from free published
full-scale drawings of an existing guitar, then changed enough to read as a
KVELD design: Floe (Telecaster), Sedge (Music Man Axis), Scree (SG), Moss
(Jazzmaster), Fjord (ES-335), Rowan (Les Paul), Heath (Stratocaster). The clay
maquettes in `standins.js` now only stand in for a model while it downloads.

The name, KVELD (Norwegian for evening), lives in `BRAND` at the top of
`blender/build_floe.py`, which models it into the headstock in Panchang, and in
the page copy. Model names and each guitar's colour live in `site/src/data.js`.

## Versions

The history is on `main`. Each iteration of the page ends at a tag.

| Tag | What it is |
|---|---|
| `v1` | The first page. One guitar (then called Nimbus), the brand still HALDEN, the ring of plinths, a close-up and the drawing chapter. |
| `v2` | KVELD: the name, the two typefaces, one colour per guitar. Floe's model polished. The hero with the close camera and the mirror floor ("Breathe on Glass"). |
| `v3` | The walk: scrolling lifts the guitar off its plinth and takes the camera along it, stop by stop. |
| `v4` | Seven guitars: the other six built from their plans, then all seven corrected one by one in review. |
| `v5` | The page around them: the drawing that becomes the guitar (Ink on Paper), the View guitar sheet, Spotlight as section 02, Last Light as the footer, the plectrum pointer. |
| `v6` | The guitar up close, and a lighter page: View guitar as a body portrait with the seven names to change guitar in place, the sheet selling instead of measuring, section 02 following the pointer, the footer with the room's details, and the performance pass (Draco models, 60 MB to 10 MB, 60 fps on Retina). |
| `v7` | The rest of the page and the final polish: the workshop on the bench, 02 Hear them with synthesized guitars, 03 How to order on an order slip, the Fretboard header, Amp Plate type (hosted), the Halo loader, Long Fade on the arch, the scroll's sound, and a QA pass against a blind judge. |

To look at an older one:

    git checkout v3
    python3 -m http.server 8013 --directory site      # tools/serve.py only exists from v5
    git checkout main                                  # to come back

At `v1` to `v4` the repo holds the page only (`site/`). The Blender builds, tools and notes
arrive with `v5`.

Side tags keep things that are not on that line: `alt/hero-options` (the four hero
options behind `?hero=`), `alt/scree-1961-guard` (Scree with the 1961 guard and heel),
`alt/unpicked-options` (the options not chosen for section 02, the drawing and the footer,
behind `?index=`, `?draft=`, `?footer=`), `alt/dark-hero` (the darker hero Sam turned down) and
`alt/workshop-options` (the three workshop options behind `?shop=`, with the gallery's pictures
and `tools/shop_pictures.mjs`), `alt/v7-options` (navigation, tour, drawing, workshop words and order
options behind `?nav=`, `?walk=`, `?ink=`, `?words=`, `?order=`), `alt/v7-fonts` (`?type=`), `alt/v7-loaders`
(`?loader=`) and `alt/v7-glow` (`?glow=`).

A new tag is for something big, a new section or a redesign. Fixes land in the version they
belong to.

Not in the repo, on purpose (`.gitignore`): `reference/` (the plan sheets are licensed for
personal use only), the overlay images that show their ink, the videos in `media/` and `demo/`,
check stills, and Blender's test renders.

## Run it

```bash
python3 -m http.server 8013 --directory site
```

Then open `http://localhost:8013`. The model on its own, to inspect while
polishing it, is at `http://localhost:8013/inspect.html?g=<id>` (all seven: the buttons along the top or the keys 1 to 7 switch guitars; orbit, set views,
parts to hide or solo, studio or showroom light, wireframe). It uses ES modules, so it needs a server,
not `file://`. Everything is vendored in `site/vendor/` (three.js r186, GSAP
3.13, Lenis 1.1.14, and the two faces in `vendor/fonts/`: Panchang from
Fontshare, Martian Mono from Fontsource). No network requests.

## How it fits together

```
reference/telecaster/   the plan PDFs (electricherald.com), their SVGs, parsed JSON
tools/parse_plan.py     PDF-to-SVG strokes, chained into outlines
tools/extract_tele.py   traces the body silhouette, lines up pickguard and neck,
                        writes reference/telecaster/parsed/tele.json
blender/build_floe.py builds the guitar, bakes the wood textures, exports
                        site/assets/models/floe.glb and site/assets/data/floe.json
blender/render_views.py Cycles check renders into blender/renders/
site/                   the landing page
```

Rebuild the model:

```bash
/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 tools/extract_tele.py
blender -b -P blender/build_floe.py --
blender -b -P blender/build_floe.py -- --render --no-export
```

Check the model against the original sheet (independent of the extraction):

```bash
blender -b blender/floe.blend -P tools/plan_overlay.py
```

It renders the model straight on at the plan's own scale, finds the alignment by
itself (cross-correlation, nobody places it) and writes `media/plan-vs-model.png`.
Last run: the whole body outline within 0.033 in of the drawn line.

The build prints the body size it produced against the plan: 15.960 x 12.758 x
1.750 in, which is what the drawing says.

## What comes from the drawing and what is ours

From the plans: body outline, 1.75 in thickness and 0.125 in edge radius,
pickguard outline and screw positions, neck outline and taper, the side
profile of the neck and headstock transition, 25.5 in scale, fret positions,
21 frets, dot positions, tuner post positions, string-through holes at 0.425 in
spacing, bridge and neck pickup positions, control plate screws, jack bore,
neck screws, skunk stripe.

Ours: the headstock outline (six in line, straight bass edge, slanted tip), the
logo, the finish and the hardware styling. The headstock shape is the part of a
real guitar that is trademarked, so it was redrawn on purpose.

The blueprint in the "Drawings" chapter is plotted at runtime from
`site/assets/data/floe.json`, which the Blender build writes from the same
numbers it models with. The drawing and the model cannot disagree.

## The walk (scroll sequence)

Scrolling past the room pins it, lifts the guitar in the centre off its plinth
and takes the camera along it, stop by stop, then lays it flat and straight on
as the drawing chapter comes up. Built as data:

- `site/src/stops.js`: one list of stops per guitar. Each stop names the parts
  it aims at (node names in the GLB), the camera's direction in the guitar's own
  frame, how much to fit, roll, the guitar's turn under the key light, lens, and
  the copy. Maquettes get `workshopStops(info)`, three stops with workshop copy.
  A new guitar only adds its own list here.
- `site/src/sequence.js`: `BEATS` (scroll length of the lift, each travel, each
  hold, the outro, in screen heights), `LIFT` (how far it rises), the framing
  maths, and `sample()`, a pure function of scroll position, so scrolling back
  plays it in reverse.
- `site/src/showroom.js`: applies the shot (`W` in `update`), `FILL`,
  `LOOK.dof` (depth of field strength), the lens shift that moves the guitar
  aside for the copy, the chrome softening that stops knobs blooming.
- `site/src/main.js` section 8: the pin, the copy, the ticker and the bar.
  Reduced motion cuts from stop to stop instead of travelling.
- Wound strings get their winding in a shader (`windStrings` in
  `guitar-look.js`), faded out once a ridge is under a couple of pixels.

## Knobs

- `site/src/showroom.js`, `LOOK` at the top: exposure, bloom, spot and rim
  light strength, the centre guitar's spin speed, ring step duration, grain.
- `DIM` and `GLOW` in the same file: how fast the side guitars fall into the
  dark, per slot.
- `layout()`: the ring's path points for wide and tall screens, `camBase` (the
  close framing at rest) and `camWide` (where a turn pulls back to, low over the
  glass). `breathe()` blends between them from the ring's speed: out fast, in
  slow, so steps, drags and flings all breathe. Off with reduced motion.
- `FloorShader`: the black glass. `uStrength` and `uFres0` set how mirror-like it
  is; the reflection only shows at a grazing angle, which is why the wide shot is
  low.
- `glowGain()`: evens out the glow across the seven colours by luminance, so the
  blue guitar lights the room as much as the yellow one.
- `site/styles.css`, `:root`: fonts, ink and bone, the expo easing curve.
- `site/src/data.js`, `colour` on each guitar: its light. While it is in the
  centre the halo, cone, dust, wall seams, floor pool, warm rim light and the page accent
  take it, cross-fading round the colour wheel as the ring turns (`applyPalette`
  in showroom.js).
- `site/src/main.js`: Lenis weight (`duration: 1.4`), reveal timing.

## The other six (session 5)

```bash
PY=/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13
$PY tools/extract_strat.py && blender -b -P blender/build_heath.py --     # Heath
$PY tools/extract_jm.py    && blender -b -P blender/build_moss.py --      # Moss
$PY tools/extract_sg.py    && blender -b -P blender/build_scree.py --     # Scree
$PY tools/extract_335.py   && blender -b -P blender/build_fjord.py --     # Fjord
$PY tools/extract_axis.py  && blender -b -P blender/build_sedge.py --     # Sedge
$PY tools/extract_lp.py    && blender -b -P blender/build_rowan.py --     # Rowan
```

- `tools/plan_kit.py`: reading the sheets (SVG strokes with their transforms,
  loops, circles, silhouettes, debug plots). Each `extract_<id>.py` writes
  `reference/<id>/parsed/<id>.json` in the model frame.
- `blender/kveld_kit.py`: Floe's own builders, moved out unchanged (Floe
  rebuilds byte for byte identical from it).
- `blender/kveld_parts.py`: the house parts. `body_shell` builds any body from an
  outline and two height functions (contours, bevels and carves are just
  functions), with binding, rim material and f-holes. `BoltOnNeck` and
  `SetNeck` (built straight, pitched about the joint, 3+3 head on its own
  angled face). Fretboards with binding, frets, KVELD markers, the house tuner,
  knob, switch tips, strap button, rim jack and neck plate. Single coils,
  soapbars, covered and open humbuckers, rings seated under the strings. Vintage
  vibrato, Jazzmaster bridge and vibrato, tune-o-matic, stopbar, hardtail.
  `ArchMap` turns a drawing's contour lines into a height field.
  `figured_top_png` paints burst and flame.
- Checks: `blender -b blender/<id>.blend -P blender/render_check.py -- <dir> "name:Part+Part:dx,dy,dz:dist"`
  for Cycles close-ups, `PLAN=<pdf> OUT=media/plan-vs-<id>.png blender -b blender/<id>.blend -P tools/plan_overlay.py`
  for the overlay (it now finds any quarter turn or mirror by itself),
  `GUITAR=<ring index> node tools/stills.mjs 1000x575 <label> 2.5 4.3` for page
  stills, `GUITAR=<i> node tools/tune_turns.mjs <id>` to pick each stop's `turn`
  by counting blown-out pixels, `tools/sheet.sh <label>` for a contact sheet.
- Page: each entry in `data.js` has `real: true, model: ...`. `Showroom.load`
  loads the centre guitar first (the loader's bar) and swaps the others in as
  they arrive, nearest first. Stops per guitar in `stops.js`.

### What comes from the drawings and what is ours

| | Sheet (free, electricherald.com) | Measured | Judged | Ours (departure from the drawn outline) |
|---|---|---|---|---|
| Heath | Strat body front/back, assembled 1:1 plan, 1962 Fender drawing | outline, 1/2 in edges, contour lines, 5/8 in at contoured rim, pickups, bridge, knobs | contour falloff curve | horns 10.3 / 7.2 mm shorter and rounder, guard redrawn (7 screws), controls on their own plate, rim jack |
| Moss | Jazzmaster body, routes and guard 1:1 | outline, pocket, pickups, bridge posts (the saddle line lands on them to 0.006 in), vibrato route | the comfort contours (the sheet leaves them out), 0.3 in edges | offset softened (treble waist 7.1 mm), horns 11.1 / 5.8 mm, one control plate instead of the rhythm circuit, tortoise guard round the pickups, rim jack |
| Scree | SG template 1:1 (body, bevel lines), SG plans in mm (scale, bridge, sections) | outline, bevel lines, 35 mm body, 2 and 13 degree pitches, slanted bridge, stopbar, pickups, knobs | bevel depth 0.42 in, board height at the joint | horns blunted and rounded 6.8 / 12.6 mm, waists filled 6.6 mm, bevels as an even band along the rim (fading out at the neck and the horn tips), a guard of our own round both pickups (mirror-symmetric, top corners following the cutaway bevels, sides echoing the waist), rim jack |
| Fjord | ES-335 1:1 (P. Sharkey) | outline, arched top from its contour map (0.05 to 0.45 in), 1 3/4 in rim, 24.54 in scale from its frets, 4 / 17 degree pitches, bridge, pickups, knobs | the back's arch (85% of the top), board height at the joint | sound holes of our own shape, horns 8.5 / 8.4 mm, no guard, toggle on the treble horn, rim jack |
| Sedge | Music Man Axis 1:1 | outline, carve start line, scale (648 mm), 22 frets, 10 in radius, pickups, volume knob | the carve (0.3 in at the rim), body 1.75 in | horns 10.1 / 7.4 mm, waists 5.3 mm, gentler carve, fixed string-through bridge for the locking vibrato, tone and three-way added, rim jack |
| Rowan | Les Paul isolines 1:1, carved-top sections and front plan 1:1 | outline, 12 isolines, cap 3/16 in at the rim and 0.543 in at the crown, 1.845 in mahogany, bridge, stopbar, pickups | scale 24.75 (no frets drawn), saddle line 0.19 in ahead of the treble post (as on the SG plans) | cutaway horn 9 mm, heights between the drawn isolines ours (fuller crown), knobs on an arc, no guard, back cover following the knob arc, rim jack |

All seven share the KVELD headstocks (six in line on bolt-ons, three a side on
set necks), markers, logo, tuners, knobs, switch tips, strap buttons and jack.
Overlays of each model on its sheet: `media/plan-vs-<id>.png` (Floe's is
`media/plan-vs-model.png`).

## Standalone and Aura (2026-11-02)

Two builds, both from `node tools/build-standalone.mjs`, both on the same tag:

- `standalone/kveld.html`, 1.2 MB, one file with the code and stylesheet inside. This is the one to double-click.
- `standalone/aura/index.html`, 6.8 KB, the same page with the code and stylesheet on the CDN. This is the one on Aura, because Aura's connector takes a file's text inside the call and 1.2 MB does not fit in one. It departs from the "inline the stylesheet" rule on purpose. If the CDN doesn't answer, the page's words still read on a dark ground.

**Aura project:** KVELD Showroom V7, `ff0e4a11-082b-4d0d-9b46-553f650a2854`, https://aura.build/editor/0da58110-baf2-46eb-a3f5-9b505886e5ae . Not published.

**Assets:** `Sam1983Aing/aura-assets`, folder `kveld/`, tags `1.25.0` and `kveld-v3` (`1.24.0` / `kveld-v2` is the first Aura page, before the stretch fix, and `1.23.0` / `kveld-v1` the same tree without `app/`).
Base URL: `https://cdn.jsdelivr.net/gh/Sam1983Aing/aura-assets@1.25.0/kveld/`
The tree mirrors `site/`: `assets/models/*.glb`, `assets/shots/*`, `assets/icon.svg`, `vendor/fonts/*`, `vendor/draco/*`, plus `app/kveld.min.js` and `app/kveld.min.css`. The full list with byte counts is written to `standalone/hosted.json`.

**To change anything:**
1. Set the next numeric tag in `TAG` at the top of `tools/build-standalone.mjs` and run it.
2. Copy `standalone/hosted/` over `kveld/` in a clone of aura-assets (the licences stay there, the copy doesn't remove them), commit, push, tag twice, push the tags.
3. `python3 tools/verify_cdn.py` until every file passes. A new tag answers 403 for a few minutes, because the repo is over jsDelivr's 50 MB package limit and each file is fetched singly the first time. Don't point a live page at a tag until this passes.
4. Paste `standalone/aura/index.html` into the Aura project, or update it through the connector. Only the tag in the URLs changes.

**Cover image:** `media/aura-cover-800x600.png`, from `node tools/cover_shot.mjs`: the hero's main visual alone, Floe centred in the halo, no words and no other guitars.

Checks: `tools/resize_check.mjs [url]` (the hero keeps its shape when the window changes size), `tools/standalone_check.mjs` (walk from `file://`, then the CDN cut off), `tools/embed_check.mjs` (inside a locked-down iframe), `tools/load_check.mjs <url>` (timing at each speed).

The plan trace (`plan_outline`) is removed from the data at build time and the build stops if any is left. `site/assets/models/floe.glb` has its textures re-encoded by `tools/glb_textures.py` (`floe_ash_normal=80 floe_ash=62`, 889 to 675 KB). A Blender rebuild of Floe overwrites that, so run it again afterwards.

## The polish pass (2026-10-31, still V7, not tagged)

Scorecards: `teach/reviews/` (rubric, before, after). Reels: `demo/v7/final/` (not in git).

**One switch, one level.** Sound is off until the switch in the header (or Hear them's, which is the same one: `sound.js`). The whole scroll bed is `site/src/ambience.js`, and **`LEVEL` at the top of it is the one number to change by ear**: 0.7 is about 3 dB quieter, 1.4 about 3 dB louder. To try a level without editing: add `?ambience=1.4` to the address, or type `__ambience.level(1.4)` in the console. Per-layer gains are `GAIN` under it, and how much of the room each section has is `SCENES`.

**To hear or measure it:** `node tools/record_sound.mjs demo/v7/final/page-desktop desktop full` records the page with what its own audio graph plays (Chrome stays muted), and writes an mp4, a WAV and the levels per section. Plans: `full`, `hear`, `bench`, `order`, `hover`. `python3 tools/sound_stats.py file.wav` reads any WAV.

**Addresses.** KVELD has none yet. `CONTACT` at the top of `site/src/footer.js` holds the email, the text number and the social pages. A social page with no address says "Not yet" when pressed. The email and text are placeholders.

**Hand-offs.** `site/src/handoff.js`: `riseOver(next, prev)`. Every section after the room comes up over the one before, which holds a screen longer and sinks under it. Reduced motion stacks them plainly.

**Type.** The label sizes are tokens in `:root` of `styles.css` (`--t-tiny`, `--t-label`, `--t-action`, `--t-value`, `--t-read`, tracking `--tr`). `node tools/type_audit.mjs` reads the live page back.

**Hover and focus.** "the family of controls" in `styles.css`: a pill fills with light from the side, a line brightens and its arrow moves ahead, one focus ring, `--h` for the time. `node tools/hover_check.mjs demo/qa/hover` shoots every control at rest, hovered and focused.

**Tools.** Anything that starts Chrome goes through `tools/chrome.mjs` (closed on every way out, `chrome-guard.mjs`). `tools/record.mjs` is the demo recorder with that guard. `tools/audit.mjs` shoots every part at one window size. `demo/qa/record-base.sh <label>` records forwards, backwards, a flick and a phone.

## What V7 changed (2026-10-23 to 11-02)

- **The hero**: the arrows sit on the halo's line, left and right, as two beads of light in the
  guitar's colour. The colour dots are gone. The name stands on the centre plinth and View guitar
  sits on the plinth's face. All of it is placed from the 3D scene: `heroAnchors()` in
  `showroom.js` projects the halo and the plinth to the screen, `placeStage()` and `placeArrows()`
  in `main.js` use it. The arrows follow the pointer's parallax but not a turn's pull-back, so
  they stay under the pointer. On a turn they go dark and the name and button fade until the
  camera lands. The spec line that was under the name is gone.
- **The workshop** (`site/src/workshop.js`, `#workshop` in `index.html`, between the tour and 02):
  the guitar on a walnut bench under one lamp, building itself over five screens of scroll. Two
  blanks are set down, a saw line (a clipping plane) runs down them, the frets drop in, the finish
  is wiped on from the tail (a shader sweep on the body and neck materials: raw colour ahead of
  the line, the real finish behind it, a wet edge at it), the hardware is set down and the strings
  go on last. The words follow the guitar's own weeks and price from `specs.js`. It has its own
  renderer, draws only while on screen and moving, copies the guitar the room has already loaded,
  and is compiled behind the loader. Tunable light: `window.__shop.LIGHT` in the console.
  Reduced motion shows each stage done. Measured at 1725 x 990 at 2x: 60 fps while scrolling it.

- **02 · Hear them** (`site/src/spotlight.js`, `site/src/voices.js`): a click on a name plays that
  guitar's phrase and turns the sound on, then pointing at a name plays it. The arch behind the
  guitar ripples with the waveform. The jump to the hero is a small "See it in the room" link. The
  sound is synthesized in the browser (plucked-string models through a rig per guitar, all in
  `RIG` and `PHRASE` at the top of `voices.js`). `node tools/voices_render.mjs` writes the seven to
  WAV in `media/checks/voices/`. `tools/record_sound.mjs` records the section with its sound (`demo/v7/record-hear.mjs` is the older way and no longer works, the page's debug log of phrases is gone).
- **03 · How to order** (`site/src/order.js`, `#order`): a light chapter on the drawing's paper.
  Four steps joined by a line that draws as you scroll, the seven with weeks and prices, and Book
  a visit, which scrolls down to the footer. The footer is 04 now. The terms (deposit, delivery,
  the Friday pictures) are invented like the rest.

- **The arch** (`site/src/halo.js`): Long Fade, Sam's pick. It holds full strength past the arrows, then thins and goes out by the plinth, drawn in one plane so the fade is a function of the angle. Motes turn round the guitar in the vertex shader. Left alone the hero draws a third of the frames, and rests after 45 s (GPU 55%, then 21%). The Hear them arch, the loader and the footer picture (`FLOOR=0.5 node tools/room_still.mjs 3`, then ffmpeg to jpg) fade the same way. The options are under `alt/v7-glow`.

## What V6 changed (2026-10-06 to 10-23)

- **View guitar** is a portrait of the body. Every number is in `CLOSE` at the top of
  `site/src/showroom.js`: the guitar lifts and leans, the camera frames the body and a lens shift
  puts it on the left (on top when the sheet sits below it, 900 px and under), the arch is
  re-placed each frame so it closes round the body, and it sways slowly. `closeTo(i)` turns the
  ring under the close camera, so the seven names along the bottom change guitar in place. Do not
  rest it between 0.40 and 0.65 rad: the rim lights mirror off the top into the lens on all seven.
  `CLOSE.gain` is a light level per finish, up close only.
- **The sheet** shows the price, the build time and Book a visit. The measurements live on the
  drawing only. Walk the guitar is gone from it.
- **Section 02** is one screen and follows the pointer, not the scroll (taps and swipes on phones).
- **The footer** (`site/src/footer.js`): the room picture re-rendered with a quieter floor
  (`FLOOR=0.6 node tools/room_still.mjs 3`), dust rising through the centre light, and a band
  with the room, hours, need info and follow under the guitars. Hours and links are placeholders.
- **Far jumps** (Book a visit, In the room) go through `jump()` in `main.js`: dark, jump, back. Do
  not scroll to `#room` from below: while it is pinned that is the end of its pin.
- **Performance**: the models are exported with Draco from Blender (`export_draco_*` in
  `kveld_parts.py` and `build_floe.py`) and decoded with `site/vendor/draco` through
  `gltfLoader()` in `guitar-look.js`. All seven load behind the loader. The mirror floor renders at
  45% and is skipped when out of frame, MSAA is 2, and the room stops drawing when nothing moves
  (after the scroll settles in the drawing or the walk, and after 10 s with no input anywhere).

## Picks made in session 6 (nothing is waiting any more)

Three sections had three options each behind a URL switch. Sam picked one for
each on 2026-10-06 and the switches are gone from `site/`.

| Section | Pick | Now lives in | The other two |
|---|---|---|---|
| The drawing comes first, then becomes the guitar (takes the place of the walk's lift) | Ink on Paper | `site/src/draft.js` (`&g=<id>` still opens on a guitar) | Contour Stack, Lights Down: `versions/v32` with `?draft=stack` or `dark`. Their branches are still in `draft.js`, unreachable, to cut in a cleanup pass |
| 02 The room index | Spotlight | `site/src/spotlight.js`, "02 · the room" in `styles.css` | `versions/v29` to `v31` |
| 03 Visit (footer) | Last Light | `site/src/footer.js`, "Last Light" in `styles.css` | Open Strings, The Ticket: `versions/v32` with `?footer=strings` or `ticket` |

With the ink chapter on, the cream chapter that plotted Floe's plan (`#drawings`)
is removed at boot, and Drawings in the header and Scroll in the corner go to the
inked plan inside the pinned room (`DRAFT.hold` screen heights). Where the ink
chapter cannot run (reduced motion, no WebGL) the cream chapter stays as the
fallback, with `blueprint.js`.

The pointer is a plectrum (`site/src/cursor.js`, "pointer" in `styles.css`): its
tip is the hot spot, it takes the centre guitar's colour, fills over links, says
Drag over the room and is drawn in ink over the cream sheet. Mouse only.

The hero camera fits itself under the header: `layout()` in `showroom.js` lifts
`camBase` a little and opens the lens just enough (at most 4.5 degrees) for the
tallest guitar's head to clear the header row on any window.

To record a round again (`draft` or `footer`): `sh demo/<round>/record.sh [base-url]`, then
`node ~/.claude/skills/demo-options/scripts/reel.mjs demo/<round>/reel.json`.
The base URL defaults to `http://localhost:8013/`. Give it a frozen copy on its
own port (`python3 tools/serve.py 8029 versions/v29`) to keep editing `site/`
while it records.

After changing files that are already open in a browser, bump the `?v=` tag in
`site/index.html` (every entry together): it gives each file a new address, so
an ordinary reload can't mix old and new copies.

What the drawing-first options rely on, for all seven guitars:
`assets/data/<id>.json` for the lines, and a depth map of the model rendered
straight down at load for their heights (so a line rises to the real surface).
Nothing is drawn by hand per guitar.

### Product stills

`site/assets/shots/` holds transparent WebP stills rendered from the models
(`<id>-hero`, `<id>-front`, `<id>-body`), `frames.json` (where each front still
sits in the guitar's own frame, so a drawing can be laid over it) and
`room-wide.jpg`. Re-render after a model changes:

    # serve the project root on :8030 (launch.json: kveld-root), then
    node tools/product_shots.mjs            # all seven, or: node tools/product_shots.mjs rowan,floe
    node tools/room_still.mjs 3             # the wide room, guitar 3 in front; then ffmpeg -i room-wide.png -q:v 3 room-wide.jpg

The front stills use an orthographic camera at 1420 px per metre for every
guitar, so they compare true to size. Prices and build times in
`site/src/specs.js` are invented.

## Plan sources and their terms

- Electric Herald free templates, all downloaded with Sam's OK:
  Telecaster, Stratocaster, Jazzmaster, SG Custom, ES-335, Les Paul and Music
  Man Axis pages on https://www.electricherald.com/guitar-templates/ .
- Terms (https://www.electricherald.com/tc.html): view, download and print for
  your own personal use; no republishing, no showing the material in public,
  no commercial use, no modified copies. So the PDFs stay in `reference/` for
  building from. The page shows only our own models and drawings plotted from
  our own numbers. The overlay images do contain the sheets' ink: keep them
  private unless Electric Herald agrees, or blank the sheet out before using
  them in a video. The ES-335 sheet itself is CC BY-NC-SA (P. Sharkey).
