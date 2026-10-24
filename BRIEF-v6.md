# Brief for V6

Written 2026-10-06, at the end of the V5 session. Read this, then `ROADMAP.md`
(the notes at the bottom are the detailed history) and the "Versions" section
of `README.md`.

## Where the project stands

KVELD is a scroll-driven 3D showroom for a fictional guitar maker. Seven
guitars, each rebuilt in Blender from a real model's published plans and then
changed enough to be KVELD's own.

It is a git repository. `main` has five commits, one per version, tagged `v1`
to `v5`. It is pushed to a private GitHub repo, `Sam1983Aing/kveld-showroom`.
The working folder is clean at `v5`.

The page, top to bottom, as of `v5`:

1. **Hero.** The ring of seven plinths over black glass, bright halo, the room
   lit in each guitar's colour. Sam chose this look twice. See "What Sam
   likes" below.
2. **Ink on Paper.** Scrolling from the hero, the room turns to a cream sheet,
   the guitar's plan is inked with its dimensions, stands up into section
   lines, and the finish spreads out from the bridge. `site/src/draft.js`.
3. **The walk.** The camera travels along the guitar through seven stops with
   copy. `site/src/sequence.js`, `site/src/stops.js`.
4. **Spotlight (section 02).** Seven names on the left, the one in the light
   on the right with its outline, sheet and price. `site/src/spotlight.js`.
5. **Last Light (footer).** The whole room as the last picture.
   `site/src/footer.js`.

Also in the page: the View guitar sheet (per guitar, `site/src/specs.js`), a
plectrum pointer (`site/src/cursor.js`), and a header that slides away on
scroll down.

## What V6 could be

Sam has not said yet. These are the open items, biggest first. Ask him which
one V6 is before building.

1. **The walk.** Sam scored its copy 5 out of 10: every stop uses the same
   layout. He also asked whether each guitar should get its own sequence, and
   said the ending (the guitar lying flat) is weak. Recommendations given, and
   nothing built:
   - Three or four copy layouts tied to what the shot shows: one large figure
     on number stops, a dashed original outline against ours on "ours" stops,
     a leader line from the copy to the part.
   - Keep four shared stops and give each guitar two or three of its own
     (Rowan's carve lines, Fjord through the sound hole, Scree's bevel).
   - The flat ending only existed to hand over to the old drawing chapter,
     which is gone. End upright and lit, with the sheet, the price and "Next".
2. **Page weight.** The seven models are 53 MB. Nothing is compressed.
3. **Before the repo or the page goes public.** The Panchang font files may
   not be redistributable (Fontshare licence, not checked). The `plan_outline`
   points in `site/assets/data/*.json` are traced from the Electric Herald
   sheets, which are personal use only. Prices and build times in `specs.js`
   are invented.
4. **Loose ends.** `draft.js` still carries the two unused treatments (stack,
   dark), unreachable. Reduced motion is not checked end to end. Nothing has
   been checked in a real browser window or with a resize mid-walk.

## Rules that are easy to get wrong

- **Versions.** A new tag only for something big, a new section or a
  redesign. Commit fixes without tagging. Never recreate a `versions/` folder.
  Don't push unless Sam asks.
- **Options.** When Sam asks for ideas or options for a section, build three
  into the real page behind a URL switch and send recorded reels (the
  `demo-options` skill). Not a written list.
- **What Sam likes.** He turned down a darker, quieter hero: "there was more
  light, so it feels more premium." Keep glow and brightness. Fix defects
  inside the bright look.
- **Journal.** Keep `teach/journal.md` going with short entries for decisions,
  techniques and wrong turns (the `teachable-build` skill).
- **Writing.** No em dashes in anything written for Sam, including page copy
  and commit messages.

## Running and checking

Serve the page from Sam's Terminal panel, so it stays up after a turn ends:

    python3 tools/serve.py 8013 site

Use `tools/serve.py`, not `python3 -m http.server`. The plain server lets the
browser keep old files, and Sam then sees a mix of old and new.

After changing files Sam already has open, bump the `?v=` tag in
`site/index.html` (now `?v=35`, every entry together). One ordinary reload
then shows the change.

The in-app Browser pane does not render WebGL while hidden. Check with
headless Chrome and `playwright-core` (see `tools/stills.mjs`). Wait for every
model to be ready before recording, and don't run stills while a recording is
in progress.

To look at or record an older version, export it to a scratch folder and serve
that:

    git archive v4 site | tar -x -C <scratch folder>

## Where things are

| What | Where |
|---|---|
| The page | `site/` |
| Blender builds, one script per guitar | `blender/build_<id>.py`, shared kit in `kveld_kit.py` and `kveld_parts.py` |
| Each guitar's drawing data (written by its build) | `site/assets/data/<id>.json` |
| Product stills for Spotlight and the footer | `site/assets/shots/`, made by `tools/product_shots.mjs` |
| Reels from past option rounds | `demo/` (videos are not in git) |
| Things built and not chosen | git tags `alt/hero-options`, `alt/scree-1961-guard`, `alt/unpicked-options`, `alt/dark-hero` |
| Licensed plan sheets (never publish) | `reference/` (not in git) |
