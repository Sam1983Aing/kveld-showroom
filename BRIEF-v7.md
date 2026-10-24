# Brief for V7

Written 2026-10-23, at the end of V6. Read this first, then `ROADMAP.md` (the notes at the
bottom are the detailed history), the "Versions" and "What V6 changed" sections of
`README.md`, and the last blocks of `teach/session-log.md`.

## Where the project stands

KVELD is a scroll-driven 3D showroom for a fictional guitar maker. Seven guitars, each rebuilt
in Blender from a real model's published plans and then changed enough to be KVELD's own.

- **Folder:** `Landing Pages/Interactive 3D/009 Guitars`. It was `Claude Code/013 3D Guitars`
  until 2026-10-13, so older notes and memories may still say 013.
- **Git:** `main` has six commits, one per version, tagged `v1` to `v6`, plus four `alt/` tags
  for things built and not chosen. Pushed to the private repo `Sam1983Aing/kveld-showroom`.
  The working folder is clean at `v6`.

The page, top to bottom, as of `v6`:

1. **Hero.** The ring of seven plinths over black glass, the bright halo, the room lit in each
   guitar's colour. Sam chose this look twice.
2. **View guitar** (the button in the hero). The camera comes in on the body, which lifts, leans
   and sways slowly, the arch closes round it, and the sheet takes the right half: price, build
   time, Book a visit, materials, what KVELD changed. The seven names along the bottom change
   guitar in place. Sam: "this is just awesome".
3. **Ink on Paper.** Scrolling from the hero, the plan is inked with its measurements, stands up
   into section lines, and the finish spreads out from the bridge. `site/src/draft.js`.
4. **The walk** (the close-up tour). The camera stops seven times along the guitar, with copy.
   `site/src/sequence.js`, `site/src/stops.js`. It still ends with the guitar lying flat.
5. **Section 02, Spotlight.** Seven names, the one under the pointer in the light. One screen.
6. **Last Light (footer).** The room as the last picture, dust in the centre light, and under
   the guitars the room, hours, need info and follow.

**Performance** on Sam's Mac (M1 Max, Chrome window about 1725 x 990 on a 2x screen): 60 fps in
every part, the page 9.9 MB, the GPU about 75% busy while something moves and back near idle when
nothing does. Measured with `tools/perf.mjs` and `tools/gpu_busy.sh`.

## What V7 could be

Sam has not said yet. Ask him which one V7 is before building. Biggest first.

1. **Finish the walk.** It is the last part Sam has not signed off.
   - 17 rewritten stop lines, so the tour stops repeating the drawing's measurements, are in
     `demo/v6/copy-step2.md`, waiting for Sam's read since 2026-10-06. He chose "words only".
   - The ending. The guitar is laid flat, which only made sense for the old drawing chapter.
     The idea on the table: end upright and lit, maybe arriving in the View guitar screen. Show
     it as recorded options before building it.
   - Sam scored the walk's copy 5 out of 10 because every stop uses the same layout. Different
     layouts per kind of stop were proposed and not built. Only if he wants them, as options.
   - Each guitar getting two or three stops of its own (Rowan's carve, Fjord's sound holes,
     Scree's bevels) was asked about in V5 and never decided.
2. **Small decisions Sam owes.**
   - After 10 s untouched, View guitar's slow sway and the hero's spin freeze (the performance
     pass did that to rest the GPU). Sam asked for that sway on 2026-10-07. Keep it moving or not?
   - The footer's hours (11:00 to 18:00), "Halden, Norway" and four links that go nowhere are
     placeholders. "Concept study" in the base line is the only thing left saying KVELD is not real.
3. **Going public.** The Panchang font files (Fontshare licence, not checked for redistribution),
   the `plan_outline` points in `site/assets/data/*.json` (traced from Electric Herald sheets,
   personal use only), invented prices in `site/src/specs.js`. Then hosting: GitHub Pages (the
   `publish-project-to-github` skill) or a standalone file (the rules in `Landing Pages/CLAUDE.md`).
4. **Performance, what is left.** Pixel ratio is still up to 2 on Retina, the GPU still runs at
   about 75% whenever anything moves, one 677 ms task sits behind the loader, and nothing has been
   checked on a mid-range laptop or a real phone.
5. **Loose ends.** `draft.js` still carries the two unpicked treatments, unreachable. Reduced
   motion has not been checked end to end, nor a resize mid-walk.

## Rules that are easy to get wrong

- **Versions.** A version is a tag on `main`, only for something big (a section, a redesign).
  Commit fixes without tagging. Never recreate a `versions/` folder. Push only when Sam says.
- **Options.** When Sam asks for ideas or options, build three into the real page behind a URL
  switch and send recorded reels (the `demo-options` skill). Not a written list.
- **What Sam likes.** More light reads as premium to him ("there was more light, so it feels more
  premium"). A subtle transition reads as nothing happening ("the movement is so subtle and
  minimal"). Keep the glow and make moves clear and physical. Fix blown highlights inside the
  bright look, never by dimming it.
- **Check at his size.** His window is about 1725 x 990 CSS px at 2x. Also check 1000 x 575 and a
  phone. Recordings at 1x hide what 2x costs, so measure at 2x. Record reels at 1380 x 792 (same
  shape, smoother capture).
- **Teaching.** Keep `teach/journal.md`, `teach/session-log.md` (one block per ask, in Sam's
  words) and `teach/decisions.md` (who brought each idea, who decided) going, and before and after
  stills in `teach/shots/`. Before any public claim about who thought of what, check
  `decisions.md`.
- **Writing.** No em dashes and no semicolons in anything for Sam, including page copy and commit
  messages.

## Technical traps

- **The room is pinned for about twenty screens.** Scrolling to `#room` from below lands on the end
  of its pin (the last shot of the walk). Use `jump()` in `main.js` to go to the top.
- **The room stops drawing when nothing moves** (`idleTime`, `wake()` in `showroom.js`). Anything
  new that animates in the room has to wake it, or it freezes after 10 s.
- **In View guitar, never rest the guitar between 0.40 and 0.65 rad.** The rim lights mirror off
  the top into the lens on all seven (measured). `CLOSE` in `showroom.js` holds every number.
- **Models are Draco-compressed.** The page needs `site/vendor/draco`. The Blender builds export
  with the Draco flags, so a rebuilt model comes out compressed.
- **Cache tag.** After changing files Sam already has open, bump `?v=` in `site/index.html`, every
  entry together (now `?v=43`).
- **WebGL checks.** The in-app Browser pane renders nothing while hidden. Use headless Chrome with
  `playwright-core` from `tools/node_modules` (`npm install` in `tools/` if missing):
  `tools/stills.mjs`, `tools/perf.mjs`.

## Running and checking

Serve the page from Sam's Terminal panel, so it stays up after a turn ends:

    python3 tools/serve.py 8013 site

Use `tools/serve.py`, not `python3 -m http.server`: the plain server lets the browser keep old
files. Port 8014 belongs to another project's server. To look at an older version, export it to
a scratch folder and serve that on its own port:

    git archive v5 site | tar -x -C <scratch folder>

## Where things are

| What | Where |
|---|---|
| The page | `site/` |
| View guitar: framing, light, sway | `CLOSE` and `closeTo()` in `site/src/showroom.js`, section 3 of `site/src/main.js` |
| Blender builds, one script per guitar | `blender/build_<id>.py`, shared kit in `kveld_kit.py` and `kveld_parts.py` |
| Each guitar's drawing data | `site/assets/data/<id>.json` |
| Stills for Spotlight and the footer | `site/assets/shots/`, made by `tools/product_shots.mjs` and `tools/room_still.mjs` |
| V6 reels, record scripts, the copy list | `demo/v6/` (videos are not in git) |
| Performance measurements | `tools/perf.mjs`, `tools/gpu_busy.sh` |
| Teaching notes | `teach/` |
| Licensed plan sheets (never publish) | `reference/` (not in git) |
