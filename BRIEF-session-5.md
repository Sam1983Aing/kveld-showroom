# Brief · Session 5 · The six remaining guitars

Read `ROADMAP.md`, `README.md` and the end of `teach/journal.md` first.
The walk (session 4) is built and frozen in `versions/v5/`.

## Goal

Replace the six clay maquettes in the ring with real guitars, each one
rebuilt from the published 1:1 drawings and real specs of an existing guitar,
then changed enough that it reads as a KVELD design and not a copy. Same
standard as Floe: it has to hold up at every stop of the walk.

**Free sources only.** This is a concept page and Sam is not paying for
plans. You have Sam's OK to download the free template PDFs from
electricherald.com for the six guitars below. Anything else that costs money
or needs an account: ask first. Read the site's terms for the templates and
note them in the README.

## The six

| Ring | KVELD | Based on | Free plans |
|---|---|---|---|
| 02 | Sedge | Music Man Axis (replaces the PRS idea, which has no free plans) | [Axis templates](https://www.electricherald.com/music-man-axis-templates/) |
| 03 | Scree | Gibson SG | [SG Custom templates](https://www.electricherald.com/gibson-sg-custom-guitar-template/) |
| 04 | Moss | Fender Jazzmaster | Electric Herald, in the [templates archive](https://www.electricherald.com/guitar-templates/) |
| 05 | Fjord | Gibson ES-335 | [ES-335 templates](https://www.electricherald.com/gibson-es-335-templates/) |
| 06 | Rowan | Gibson Les Paul | Electric Herald, in the archive |
| 07 | Heath | Fender Stratocaster | Electric Herald, in the archive |

Build order: Heath (Strat) first, because it is closest to Floe (bolt-on,
flat slab, 25.5 in) and is the easiest way to turn `build_floe.py` into a
shared kit. Then Moss, Scree, Fjord, Sedge, Rowan. The two carved tops come
last.

### Real specs to start from

Check every number against the sheet. Where they disagree, the drawing wins.

| | Scale | Frets | Radius | Nut | Body | Neck |
|---|---|---|---|---|---|---|
| Axis | 25.5 in | 22 | 10 in | 1.625 in | basswood, carved maple top | bolt-on |
| SG | 24.75 in | 22 | 12 in | 1.695 in | mahogany slab, bevelled | set |
| Jazzmaster | 25.5 in | 21 | 7.25 in | 1.65 in | alder, offset waist | bolt-on |
| ES-335 | 24.75 in | 22 | 12 in | 1.695 in | laminated maple, centre block | set |
| Les Paul | 24.75 in | 22 | 12 in | 1.695 in | mahogany, carved maple cap | set |
| Stratocaster | 25.5 in | 21 | 7.25 in | 1.65 in | alder, contoured | bolt-on |

The free PDFs are flat drawings. For the carved tops (Axis, Les Paul) and the
arched ES-335, shape the carve from the side views and any contour lines on
the sheet. Say in the README which heights were measured and which were
judged.

## Making it ours, not a copy

KVELD's own on every guitar (already the rule):
- The headstock: six in line for bolt-ons (Floe's outline), three a side for
  set necks (the shape in `standins.js`, to be drawn properly).
- The fret markers and the logo.
- One shared hardware kit (tuners, knobs, switch tips, strap buttons), so the
  range reads as one brand.

On top of that, every body gets at least three visible changes of its own.
Starting points, adjust them once you see the plans:

| | Changes |
|---|---|
| Heath (Strat) | horns a little shorter and rounder, pickguard redrawn with fewer screws, controls on a separate plate instead of the guard |
| Moss (Jazzmaster) | offset softened, one control plate instead of the rhythm circuit, pickguard redrawn |
| Scree (SG) | horns blunter and less pointed, bevels kept but the waist reshaped, small guard instead of the batwing |
| Fjord (ES-335) | KVELD's own f-hole shape, horn tips rounded differently, guard redrawn |
| Sedge (Axis) | horn tips and waist reshaped, carve made gentler, flame maple kept |
| Rowan (Les Paul) | cutaway horn reshaped, carve profile ours, guard and control layout redrawn |

Gibson enforces its body shapes (SG, Les Paul, ES, Flying V), so the three
Gibson-based bodies get the clearest changes. Not legal advice, just the
reason those three move more. Prove each guitar against its plan with
`tools/plan_overlay.py` and also write down how far each change departs from
the drawing (millimetres at the horns, waist, etc.), so the video can show
"this is the original line, this is ours".

## Finish and colour

Each guitar keeps its glow colour from `site/src/data.js`. The finish should
sit with it: Sedge amber flame maple, Scree dark slate over mahogany, Moss
olive, Fjord sea-green burst, Rowan cherry burst, Heath heather purple. These
are proposals. If Sam wants to choose, show options the demo-options way, not
as a list.

## Pipeline (per guitar)

1. Download the plan, parse it (`tools/parse_plan.py`), write an extraction
   (`tools/extract_<id>.py`) to `reference/<id>/parsed/<id>.json`.
2. Build in Blender from a shared kit. Pull the common parts of
   `build_floe.py` into `blender/kveld_kit.py` first (materials, frets,
   strings with winding, tuners, knobs, nut, logo, export). Floe must rebuild
   identical from the kit.
3. Name the GLB parts like Floe's (Headstock parts, Tuners, Logo, Nut, Frets,
   Neck, NeckPickup, BridgePickup, Bridge, Saddles, Controls, BackHardware,
   Body...). Add names only where a part is new (Tailpiece, CentreBlock,
   Tremolo).
4. Export `site/assets/models/<id>.glb` and `site/assets/data/<id>.json`.
   Keep each GLB around Floe's 4 MB. The final pass compresses.
5. Site: `Showroom.load` loads each real guitar's GLB, `real: true` in
   `data.js`, a stops list in `site/src/stops.js` with copy from the real
   specs. Tune each stop's `turn` until no chrome or brass blows out.
6. Check with the headless Chrome stills and reels (project memory
   "headless WebGL checks"). Freeze `site/` to `versions/v6/`, `v7/`... after
   each guitar, and record a short walk reel per guitar into `media/`.

Optional if time: the drawing chapter follows the guitar in the centre
(plotted from its own `<id>.json`).

## Working with Sam

- After each guitar, send a still and the walk reel, then carry on unless he
  stops you. Six builds won't fit in one chat's context, so update the
  ROADMAP status after each one. If the chat gets compacted, the next guitar
  starts from there.
- Keep `teach/journal.md` going: plan source, what was changed and why,
  carve decisions, any teachable bug.
- No em dashes in anything written for Sam.
