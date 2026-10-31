# Teaching journal: 009 Guitars (HALDEN showroom)

## 2026-09-25 · seed · Seed · The guitar is the interface
Started from a ChatGPT brainstorm Sam shared (chatgpt.com/share/6ab71cc1-7c74-83ea-9de6-b9af4e81fd23). The core idea: one hyper-detailed Blender guitar, and scrolling moves the camera around and into it (headstock, strings, pickups, an exploded view), presented like the launch of a fictional $4,000 handmade instrument.
Sam's ask: take the idea and "imagine and refine it". The brainstorm is ideas, not decisions.

## 2026-09-25 · seed · Turn · Real guitars, not invented ones
Sam: "instead of imagining a fictional guitar, is there any real guitar model with the real specification, dimension, like a manual you can follow and rebuild it in Blender, then change the name to fictional... at least we can get a real looking guitar."
This set the whole method: find published full-scale drawings, rebuild from the numbers, rename. Classic models (Telecaster, Strat, Les Paul, PRS, SG, ES-335, Jazzmaster) all have plans because luthiers build copies at home.
Legal note that shaped the design: body outlines are mostly fair game, headstock shapes and PRS bird inlays are the trademarked parts. So every guitar gets our own headstock.

## 2026-09-25 · seed · Direction · The room from the concept art
Sam brought an AI concept image ("AXION Guitars"): a dark circular showroom, guitars on lit pedestals in a ring, the centre one under a halo of light, the sides falling into the dark, and the ring turns to bring the next guitar forward.
Axion turned out to be an Ibanez guitar series, so the page runs on a working name, HALDEN.

## 2026-09-25 · seed · Turn · Seven different guitars
I first suggested one model in seven finishes (cheaper to build). Sam: "I don't want seven same guitar. I want maybe seven different models... based on something that already exists."
Lineup planned as seven real patterns. Seven because an odd number keeps one in the centre with three each side.

## 2026-09-26 · v1 · Asset · Nimbus rebuilt from the 1950s Telecaster drawings
Source: Electric Herald's free full-scale plan PDFs (body, pickguard, neck, headstock, fret slots). They are vector, so the outlines came out exactly: PDF to SVG with pdftocairo, strokes chained into loops, the body silhouette found by flood-filling the outside of a raster and snapping back onto the vector strokes.
Check that it worked: the built body measures 15.960 x 12.758 x 1.750 in, the drawing says 15.96 x 12.758 x 1.75. The fret slots confirm the 25.5 in scale.
Built entirely by a Python script in headless Blender 5.2 (blender/build_nimbus.py). Wood textures are generated with numpy (flat-sawn swamp ash with cathedral grain, maple), exported as a 3.9 MB GLB.
Ours, not the plan's: headstock outline, logo, finish.

## 2026-09-26 · v1 · Technique · One set of numbers for the model and the drawing
The Blender build also writes site/assets/data/nimbus.json, and the page plots its blueprint chapter from that file at runtime. The drawing on the page and the 3D model cannot disagree because they come from the same numbers.
Same philosophy as Sam's NODAL lens page (005 3D Model), where the lens is generated from its optical prescription.

## 2026-09-26 · v1 · Technique · One number turns the whole ring
The showroom is driven by a single float, u. Guitar i sits at slot s = wrap(i - u), and everything (position on the track, dimming, pedestal glow, lift) is a function of s. Arrows, dots, dragging and clicking a guitar all just tween u.
Guitars fade into the dark with a uDim multiplier patched into every material (onBeforeCompile) instead of transparency, so there is no sorting trouble. The wrap from one end of the ring to the other happens where a guitar is already black.
Built with three.js r186 (Reflector floor with a 12-tap blur, UnrealBloom, a grain pass), GSAP for the tweens.

## 2026-09-26 · v1 · Technique · The lights come on
After the loader (real download progress of the GLB), the room powers up: spot, rims, pedestal rings and the halo come on centre-first and spread outwards, while the headline rises line by line.

## 2026-09-26 · v1 · Fix · Black canvas in the Browser pane
The page rendered nothing in the in-app Browser pane. The pane was hidden, the page's visibilityState was "hidden", and hidden pages get no requestAnimationFrame, so GSAP's ticker never ran.
Fix: verify with headless Chrome through playwright-core instead. It also records video, which became the v1 reels.
Teaches: if a WebGL page is black, check whether it is even getting frames before debugging the scene.

## 2026-09-26 · v1 · Fix · "View guitar" was off the screen
The button is placed under the centre pedestal by projecting a 3D point to the screen. The projection ran before the camera's matrices had updated, so it used a stale camera and landed 1010 px down.
Fix: camera.updateMatrixWorld() before project(). Later moved the button onto the pedestal's front face, like the reference.

## 2026-09-26 · v1 · Wrap · v1
Nimbus is real, the other six are clay maquettes drawn in three.js. Room, close-up with drag-to-turn, a blueprint that draws itself on scroll, a numbered index that turns the ring.
Before for v2: versions/v1/ (frozen copy of site/), media/showroom-v1-desktop.mp4, media/showroom-v1-phone.mp4, media/v1-*.png.

## 2026-09-30 · v1 · Turn · Sam's feedback on v1
Kept: the platforms, the circle glow with floating particles, the View guitar close-up with specs, the drawing chapter and spec sheet.
Changes: seven unique guitars copied from the real models with our own names and colours, "amazing texture especially on the wood, on the strings, the back, the curves, make it shine". The glow should take each guitar's colour instead of gold everywhere. The hero guitar feels "too far". The floor reflection shows "a lot of circles", he wants a clean glossy glass floor. He doesn't like the serif font and wants name and font options that aren't common.
New signature idea: on scroll the selected guitar "comes alive", lifts out of its socket and the camera moves along it showing each part. The same sequence adapts to whichever guitar is selected.

## 2026-09-30 · v1 · Direction · Lock the sequence on one guitar first
Order chosen: name and font first (the name is modelled into every headstock), then polish Nimbus, hero v2, then build the scroll sequence on Nimbus for Sam to approve, and only then the other six, one per session.
Why: the sequence decides what every model has to survive. If the camera stops 5 cm from the saddles, all seven need saddles that hold up at 5 cm. Building six more first risks rebuilding them.
Sam runs one chat session per task. The plan lives in ROADMAP.md.

## 2026-09-30 · s1 · Options · Three identities, shown as demos
Name, model names, typeface and colours were shown as three whole identities built into the real page, not as lists. Switch: `?id=oriel|kveld|sorrel`, and `&name= &models= &type= &colours=` mix pieces from different ones. `&tour=1` turns the ring through all seven for the recording. Code: site/src/identity-options.js. Reels: demo/identity-options-desktop.mp4 and -phone.mp4. Before: the Now clip in the same reel (HALDEN, Bodoni Moda, brass).
- ORIEL (a window that lets light in): Boska + Jost. Nimbus, Solstice, Umbra, Aurora, Cirrus, Dusk, Equinox.
- KVELD (Norwegian for evening, the room sits at Halden's coordinates): Panchang + Martian Mono. Floe, Sedge, Scree, Moss, Fjord, Rowan, Heath.
- SORREL (a red-brown wood colour): Young Serif + Schibsted Grotesk. Named after pigments: Naples, Ochre, Indigo, Celadon, Graphite, Madder, Tyrian.
Name check method: web search "<name> guitars" for each candidate. Dropped for clashing: Tarn (Taran Guitars), Brume (Bruné luthiers), Kessel (Gibson Barney Kessel), Merrow (Schecter Keith Merrow), Ossian (a HILS acoustic model).

## 2026-09-30 · s1 · Technique · One colour per guitar drives the whole room
The showroom already ran every glow off one ACCENT colour. With a palette, ACCENT is recomputed each frame from the ring position u (smoothstep between the two guitars either side of centre), so halo, cone, dust, floor pool, seams and the warm rim light cross-fade as the ring turns. Each pedestal ring keeps its own guitar's colour, so the sides preview the palette. The page accent (--accent) follows the same number from the GSAP ticker, so the headline's italic word changes colour with the guitar.
Teaches: if every light reads one shared colour object, changing the look of a whole scene is a few lines.

## 2026-09-30 · s1 · Direction · KVELD
Sam watched the three reels and picked KVELD whole: the name, the wide Panchang with Martian Mono, the Nordic landscape names and the signal-bright colours. His words: "go with KVELD".
Baked in: colours now live on each guitar in data.js, the fonts are local woff2 (the page makes no network requests any more), the switch is gone. Nimbus became Floe everywhere, files included.
The logo is modelled into the headstock from Panchang Medium's TTF. Panchang runs about 25% wider than the old Bodoni, so it is set at 0.272 in instead of 0.34 in to fill the same 1.3 in on the headstock (measured in Blender before choosing the size).
Before: versions/v1/ and the "00 Now" clip in demo/identity-options-desktop.mp4. After: versions/v2/.

## 2026-09-30 · s1 · Technique · A workshop viewer next to the page
Sam asked to inspect the model on its own before polishing it. site/inspect.html loads the same floe.glb with OrbitControls and a RoomEnvironment studio light. The set views (headstock, nut, frets, pickups, bridge, controls) are computed from the named parts in the GLB rather than hand-placed cameras, so they survive a rebuild.
Teachable bug: the size readout first said the guitar was 30 in wide. Box3.setFromObject by default grows a box from each mesh's own bounding box, and one part (BackHardware) had a loose one. `setFromObject(obj, true)` measures the actual vertices: 38.80 x 12.76 x 2.81 in, which matches the drawing.

## 2026-09-30 · s1 · Technique · Proving the model sits on the drawing
Sam: "so just to understand, everything was built and not imagined... do you have an image so I can compare?"
tools/plan_overlay.py rasterises the 1:1 body plan at 60 px per inch, renders the model with an orthographic camera at the same 60 px per inch, and lets FFT cross-correlation find where the body outline fits the plan's ink. Nobody positions it. Result: 100% of the outline within 0.033 in (two pixels, under 1 mm), and the neck pocket, string ferrules, pickup route and control cavity land on their drawn positions too. Picture: media/plan-vs-model.png.
Teaches: an orthographic camera at a known pixels-per-inch turns a render into a measuring tool. Good on-screen moment for the video: plan, model, overlay.
What is not from the drawing, to say plainly: headstock and logo (ours, the real one is trademarked), the neck's back carve, hardware details, and the finish.

## 2026-09-30 · s2 · Fix · The noise was surfaces fighting for the same depth
Sam spotted noise on the tuner housings, the walnut stripe, the fret dots and the back. All four were z-fighting: two surfaces so close the depth buffer can't tell which is in front, so they flicker in a pattern that changes with distance.
- Tuner housings: the back edge was rounded by 0.1 in, the same as the corner radius, so each corner arc collapsed to one point. Blender's triangle_fill choked on the duplicate points and left holes in the cap; through them, the housing's other face sat exactly on the headstock wood. Fix: merge coincident points before filling, and sink the housing 0.03 in into the wood.
- Dots were 0.001 in proud, the stripe 0.0015 in off the neck with only three columns (its flat chords dipped back into the curved neck), the ferrule holes 0.0006 in off the metal, the post slots level with the post tops. All now stand at least 0.1 mm clear.
- The viewer's near plane was a fixed 5 mm, which spends the depth buffer's precision right in front of the lens. It now follows the camera distance. Decal parts also get a polygon offset (site/src/guitar-look.js).
Teaches: noise that changes with distance is almost always depth precision, not texture. Test: move the near plane and watch it change.
Before: versions/v2/. After: versions/v3/. Picture: media/s2-noise-before-after.png.

## 2026-09-30 · s2 · Technique · Depth under the clear coat
Premium pass on materials. The ash texture generator now writes a matching normal map from the same pore bands (open earlywood pores sit slightly below the surface). It goes on the base layer only; the clear coat keeps the smooth geometric normal. Result: a glassy coat with grain you can see into, which is what a real nitro finish looks like.
Also: full gloss coat on the neck, dots and logo under the finish, lacquered black guard (coat 1.0), chrome 0.045 rough, warmer nickel, polished frets and brass.
Lighting: the viewer's studio light is now a product-photography rig (tall softbox strips, overhead, warm grey room). First try was too dark and the chrome read as black plastic: chrome is only as good as what it reflects.
Picture: media/s2-finish.png.

## 2026-09-30 · s2 · Turn · Floe approved
Sam: "I like the guitar... it's perfect... I love the reflection and texture, feels like a real product." Floe is the standard the other six get built to. Deferred, not done: wound strings, nut slots, string wraps, sharper wood. They come back only if the scroll sequence puts a camera close enough to need them.

## 2026-09-30 · s3 · Fix · Two layout bugs that only showed on Sam's screen
At about 1000 x 575 the full stop in "Drawn from the originals." dropped onto its own line, and "In the workshop" sat on the arrows. Neither reproduced in headless Chrome (the button cleared the arrows by 13 px there), so the fixes don't rely on exact pixels:
- The headline is set with `<br>`, so `white-space: nowrap` on it: SplitText's line mask can no longer invent a third line when the browser measures a pixel tighter.
- The View button still sits on the pedestal's projected front face, but `setStageY` clamps it to at least 22 px above the arrows.
Teaches: when a bug shows on someone else's screen and not yours, fix the rule, not the number.

## 2026-09-30 · s3 · Options · Hero v2, three camera directions
Brief: camera closer, clean glossy glass floor, far fewer circles. Built as `?hero=step|glass|breathe` in site/src/hero-options.js, hooked into showroom.js through `this.opt` (init, layout, loaded, camera, frame). Reels: demo/hero/hero-options-desktop.mp4 and -phone.mp4, recorded at Sam's 1000 x 575. Before: the 00 Now clip, and versions/v3/.
Shared by all three: the floor shader swapped for glass (sharp reflection at 0.8 res, strong Fresnel, no grain), the stage rings cut to one or none, the pedestal base rings and track line gone, the model name and View guitar moved to the right edge because the headstock now reaches where the name was.
- 01 Step In: the same room, camera walked from 5.6 m to 3.75 m. Guitar goes from 44% to about 66% of the height.
- 02 Black Glass: camera at 0.36 m, looking slightly up. The pedestals had to become low plinths (scale 0.4) or the low camera could not see the floor at all. The halo is replaced by a soft wash of colour on the wall.
- 03 Breathe: closest at rest (3.05 m). Ring speed drives a pull-back to the old wide shot and a lean into the turn, out fast and in slow, so drags and flings breathe too.
Technique · even glow per colour: glow is scaled by (0.5 / luminance)^0.55, so Scree's blue (luminance 0.28) gets 1.4x and Floe's ice blue (0.69) 0.84x. Fixes "blue glows weaker" without touching the colours themselves.

## 2026-09-30 · s3 · Turn · Sam mixes two options
Sam on round one: Black Glass "feels more premium", but he loves the zoom in Breathe. His mix: keep Breathe's close framing with the halo, and when the camera pulls back for a turn, show the black glass. Also: the halo sat too high, and the platform had a "double glow" (the floor ring right round the pedestal plus the bright ring on top).
Built as `?hero=breatheglass` (04 Breathe on Glass): Black Glass's plinths and mirror floor, Breathe's camera, but the wide shot now drops to 0.4 m as it pulls back, so the low angle that makes the mirror read only happens mid-turn. Halo lowered 0.28 m to sit round the guitar, smaller on phones. Floor ring gone, the centre platform ring at 32% and back to full as it moves to the side.
Teaches: the reflection needs a grazing angle. Same floor, seen from 0.8 m, is just dark. Tying the camera's height to the turn makes the floor appear only when there's motion to reflect.
Reels: demo/hero/hero-round2-desktop.mp4 and -phone.mp4.

## 2026-09-30 · s3 · Direction · Breathe on Glass is the hero
Sam: "yes go with breathe on glass, make it the real page". Baked into showroom.js, the switch and hero-options.js removed.
Full-quality pass, with what each check found:
- Close-up targets moved down 0.134 m, the height the guitar lost when the pedestals became plinths. Checked framed on desktop and phone.
- Plinths are now their own low lathe profile (0.09 m) instead of a squashed pedestal, in black glass (clear coat 1.0, metalness down from 0.55 to 0.2) so the tops lose the brown sheen.
- Reduced motion: no breathing at all, the camera holds still while the ring jumps.
- A hard fling: the camera pulls back to 93% and settles back to rest in about 2 s, no jumps.
- The colour cross-fade goes round the colour wheel (`lerpHSL`) instead of straight through RGB, so yellow to blue passes through cyan instead of grey.
Teachable bug: the 15 wall seams share one material, so each frame the loop set 15 strengths and only the last (0.067) ever showed. Baking it in at "0.3, the first seam's value" would have made the wall 4.5 times brighter. Kept the strength they always had.
Before: versions/v3/ and versions/v4-hero-options/. After: versions/v4/, media/s3-hero-v2-desktop.mp4 and -phone.mp4.

## 2026-09-30 · s4 · Technique · The walk: camera stops as data
The scroll sequence the whole range has to hold up to. The room pins for about 15 screen heights. Floe lifts 0.3 m out of its plinth, the room goes dark round it, and the camera stops at seven parts: headstock, nut, neck, pickups, bridge, controls, back. Then it lays the guitar flat and straight on, the same view as the blueprint that comes up next.
How it works: each stop in `site/src/stops.js` names GLB parts, not positions. The page measures those parts' vertices in the guitar's own frame and frames them from a direction also given in the guitar's frame. Because the camera rides in the guitar's frame, a stop can turn the guitar under the key light (`turn`) without losing the framing. The whole thing is a pure function of scroll position (`sample()` in sequence.js), so scrolling up plays it backwards with no extra code.
Teaches: write the shot list as data aimed at named parts. A rebuilt model, or a different guitar, keeps working.

## 2026-09-30 · s4 · Technique · Small moves that make it feel shot, not scripted
- Holds drift: while the copy is on screen the camera keeps pushing in 14% and orbiting 5 degrees, so the frame never freezes.
- Lens shift for the copy: the projection matrix is offset (right on desktop, up on phones), so the guitar moves aside without the perspective changing.
- Depth of field only on the walk (three's BokehPass), aperture scaled by 1/focus², so the nut at 16 cm is shallow and the overview at 2.5 m is sharp. The depth pass hides the mirror floor, which would otherwise re-render the whole room.
- The camera leaves before the guitar: during the lift the camera blend runs ahead of the guitar's rise, or the headstock leaves the top of the frame.
- Its empty plinth flares once as the guitar leaves it.
- Ticker of stop names plus a thin progress bar along the bottom (Atelier Nadir move #6).

## 2026-09-30 · s4 · Fix · Highlights that read as lamps
Up close, the key light reflected in the brass saddles and the mirror chrome knobs bloomed into glowing blobs, so the bridge looked lit by LEDs. Two fixes, both measured on renders: each stop's `turn` was tried at a few angles until the reflection slid off (bridge 10 to 35 degrees, controls 16 to 45), and during the walk the chrome gets a touch rougher (+0.07) and the bloom threshold goes up.
Teaches: in a close-up, a point light's reflection is the brightest thing on screen. Move the object, not the light.

## 2026-09-30 · s4 · Asset · Wound strings without rebuilding the model
The model's strings are smooth tubes. At the nut stop the three wound ones looked plain. Instead of rebuilding in Blender, a shader patch (`windStrings` in guitar-look.js) bends the normal into a ridge every 0.35 mm along the string, and fades it out once a ridge is smaller than a couple of pixels so it doesn't shimmer from the room. Teachable bug on the way: the dim patch was now chained onto materials shared by several meshes and declared its uniform six times. Patch shared materials once.

## 2026-09-30 · s4 · Wrap
Before: versions/v4/. After: versions/v5/. Reels: media/s4-walk-desktop.mp4 and -phone.mp4 (Sam's 1000 x 575, and 390 x 844). Waiting for Sam's approval before guitar 2.

## 2026-09-30 · s5 · Setup · Six guitars from free plans, one kit
Sam: "build the six remaining guitars back to back... same quality as the first model." He was away overnight, so every decision below was made without him and is up for his review.
Plans: Electric Herald's free templates, downloaded with his earlier OK (reference/<id>/). Their terms allow personal use only, no republishing. So the PDFs stay in the project, and the overlays that show the drawing (media/plan-vs-*.png) are for Sam's eyes and the video only after he decides how to show them.
First move: Floe's build script split in two. Everything generic went to blender/kveld_kit.py unchanged, and Floe was rebuilt from it: the GLB came out byte for byte identical. That's the test that a refactor didn't change anything.

## 2026-09-30 · s5 · Technique · Reading a sheet that comes out upside down
The Strat sheets converted to SVG with every path carrying its own flip (matrix(1,0,0,-1,...)). The Tele's parser ignored transforms, so the first reading of the assembled Strat was a mirror image. tools/plan_kit.py now applies each path's matrix.
Second catch: the silhouette trick from the Tele (flood the page, keep what isn't reached) leaked, because the Strat's outline is open along a short straight edge at the pocket. Here the outline is a single drawn stroke, so it's used as is and closed.
Teaches: before trusting an extraction, plot it over the sheet. Both bugs showed up in the first picture.

## 2026-09-30 · s5 · Technique · Two sheets tied together by a neck
Heath's body comes from the 1:1 body sheet (which matches the 1962 Fender drawing: 12 11/16 in wide, 1/2 in edges), its hardware positions from a 1:1 assembled sheet. Different sheets, different origins. They were tied together by the neck: a Fender 21-fret neck is 18.38 in from nut to butt, so the saddle line sits 7.12 in behind the pocket floor. On the assembled sheet the frets give the nut directly (fret pairs, fitted against the 25.5 in fret formula, agree to 0.002 in). Result: the pickups land within 0.015 in of the routes on the body sheet.

## 2026-09-30 · s5 · Technique · Contours as height functions
Floe is a flat slab. A Strat has a forearm contour on the front and a belly cut on the back, both leaving 5/8 in at the edge (the 1962 sections). body_shell in kveld_parts.py builds a body from an outline plus two height functions (top and back). The caps are a constrained Delaunay triangulation of the outline with a grid of points inside (mathutils.geometry.delaunay_2d_cdt), so any carve, bevel or contour is just a function of (x, y). The contour falls from the drawn boundary line toward the rim, tapering out at both ends of the line so it never makes a step. The same builder will do the SG bevels and the carved tops.

## 2026-09-30 · s5 · Options · What makes Heath ours
- Horns: pulled back and softened by a displacement that fades with distance, then a few rounds of relaxing the points at the tip. Bass horn 10.3 mm shorter, treble horn 7.2 mm. Elsewhere the outline moves at most 1 mm.
- Guard: redrawn around the pickups only, seven screws instead of eleven, three-ply parchment (white, black, white: three stacked slabs, each inset, so the bevel shows a black line).
- Controls: off the guard and onto a curved chrome plate that follows the lower bout. Five-way blade switch, volume, two tones.
- Jack: from the football plate on the top to the house cup in the rim (Floe's).
Proof: media/plan-vs-heath.png. 91% of the outline within 0.033 in of the drawn line, the rest is the two horns, red over blue.

## 2026-09-30 · s5 · Fix · Saddles that read as fins
First vintage saddles were solid wedges and looked like a row of blades. Real ones are thin pressed steel riding on two height screws, with a short flange at the back for the intonation screw and spring. Rebuilt as a bent strip (rounded nose, gently falling top, short flange), so you see air and screws underneath.

## 2026-09-30 · s5 · Technique · Tuning the light by measurement
tools/tune_turns.mjs: for each stop it turns the guitar through a fan of angles, renders the hold, and counts near-white pixels on the guitar's side of the frame. Heath's controls went from 862 blown pixels at Floe's 45 degrees to 171 at 80. The bridge didn't improve by turning (the vibrato arm caught the light from every angle), so the camera moved instead: from the bass side, the arm sits behind the saddles with its tip in shot.
Reel: media/s5-heath-walk-desktop.mp4. Before: versions/v5/. After: versions/v6/.

## 2026-09-30 · s5 · Moss · An independent check from the bridge posts
Same tie as Heath (saddle line 7.12 in behind the pocket floor), and on the Jazzmaster sheet that line falls on the two bridge post holes, 0.006 in off. Nothing was fitted to make that happen: the sheet and the neck simply agree.
The sheet draws the body outline down into the neck pocket and back. That notch is the pocket, not the edge, so it's cut out and the mouth closed straight.
What makes Moss ours: the offset softened (treble waist filled out 7 mm and drawn up toward the bass waist), both horns shorter (11 mm and 6 mm), the rhythm circuit gone for one chrome plate (toggle, volume, tone), the guard redrawn round the pickups only as four-ply tortoise (white, black, white, tortoise, each ply inset so the bevel shows the lines), the jack in the rim.
Judged, said plainly: the comfort contours. The sheet notes they are "not shown", so their lines and depth (3/4 in at the rim) are mine.
Teachable: the camera rides in the guitar's frame, so changing a stop's `turn` never changes what you see of the guitar, only how the light falls. The back stop showed the edge whatever the turn; the fix was the `view` vector.
Reel: media/s5-moss-walk-desktop.mp4. After: versions/v7/.

## 2026-10-01 · s5 · Scree · Two sheets that disagree, and which one wins
The SG template draws the body beautifully (with its bevel lines) but its own frets put the bridge 0.6 in from where its bridge is drawn. The second sheet, a set of plans in mm, has frets that give 24.75 in to within a thousandth and a slanted bridge 0.26 in behind the scale line, which is where intonation puts one. So: body from the template, strings from the plans, and the two tied by the one thing both draw the same, the humbuckers 3.52 in apart. The overlay shows the result honestly: our bridge sits 0.23 in from the template's.
Teaches: when two drawings disagree, find what they agree on and pin them there.

## 2026-10-01 · s5 · Technique · A set neck built straight, then pitched
A glued-in neck leans back (2 degrees on the plans) and its headstock leans back again (13 degrees from the nut). Building that directly is fiddly, so SetNeck builds everything straight, exactly like the bolt-on neck, and then rotates it about the point where the neck leaves the body. The headstock gets its own frame on the angled face; tuners, veneer and logo are built flat in it. Strings are computed in the straight frame and carried over, so they always land on the nut and the posts.
Bevels: the template draws the inner edge of each bevel, so each is a straight chamfer falling from that line to the rim (0.42 in deep, judged). Same body builder as the Strat contours, just a straight profile instead of a curve.
What makes Scree ours: horns blunted (6 and 8 mm), both waists filled out 6.6 mm, a small three-ply guard round the pickups, the house 3+3 head, rim jack, horn strap button.
Fix: the slate stain read almost black in the dark room; lightened so the mahogany grain shows. Reel: media/s5-scree-walk-desktop.mp4. After: versions/v8/.

## 2026-10-01 · s5 · Fjord · An arched top from the drawing's own contour map
The 335 sheet draws one half of the top as a contour map, nine lines from 0.050 to 0.450 in above the rim. Each line is mirrored into a closed loop, the loops are nested, and the height at any point is read between the two loops it falls between, by distance to each. The result is sampled once on a grid and softened a little where the drawn halves meet the centreline. The body builder only ever asks "how high is the top here?", so a flat slab, a bevel and a carved arch are the same code.
Teaches: a contour map is a height function in disguise. Distance to the line below and the line above is all you need.
The scale on this sheet is 24.54 in, measured from its frets, not the 24.75 everyone quotes. The drawing wins, and the copy says so.
What makes Fjord ours: the sound holes (one S-shaped slot from a fine point to a single round eye, laid where the f-holes are drawn), horns shortened 8.5 mm and rounded fuller, a slim comma of a guard floating on one bracket, the jack in the rim. Judged: the back's arch (85% of the top's).
Light: the pale burst and the glossy black veneer threw big highlights; tune_turns picked angles that keep them off the lens. Reel: media/s5-fjord-walk-desktop.mp4. After: versions/v9/.

## 2026-10-01 · s5 · Sedge · A carve from one dashed line, and flame that looks like flame
The Axis sheet is a single front view. All it says about the carve is a dashed line on the bass side where the top starts to fall. So the carve is ours, said plainly: a smooth fall from that line to 0.3 in at the rim (gentler than the original, one of the brief's changes), a soft roll everywhere else, and the maple cap showing as a natural strip round the top edge.
Two tries at the flame. First looked like sand ripples: thin sine bands, wiggled at a small scale. Real flame is broad, unevenly spaced, bent in long curves and bookmatched about the seam. The fix was in the noise, not the colour: big slow warps across the board, slow changes in spacing along it, almost no small wiggle.
Ours, beyond the brief's three (horns pulled back 10 and 7 mm, waists reshaped 5 mm, gentler carve): a fixed string-through bridge instead of the locking vibrato, tone and three-way beside the drawn volume, rim jack.
Reel: media/s5-sedge-walk-desktop.mp4. After: versions/v10/.

## 2026-10-01 · s5 · Rowan · Heights that aren't written down
The Les Paul isolines sheet has twelve contour lines and no heights on them. The sections sheet does: the maple cap is 3/16 in at the rim and 0.543 in at the crown. Twelve lines over that rise is 1/32 in each, which is how carvers lay out a top, so the numbers agree. The lines stay exactly as drawn; how the top rises between them is ours (fuller over the crown, softer at the rim), which is the brief's "carve profile ours" without inventing a different carve plan.
The front plan draws its holes as crosshairs split into quarter arcs, which the loop finder paired badly; those centres were read off by hand and the pairs centred on the strings. Said in the script.

## 2026-10-01 · s5 · Fix · Pickups set the way a player would set them
Looking along the strings on Scree, Fjord and Rowan, the humbuckers sat about 0.3 in below them: correct parts, wrong heights, because rings and pickups were placed from the body up. Now they are placed from the strings down: seat_humbucker puts each pickup's top 0.13 in under the string plane (0.16 at the neck) and grows its ring to meet it. Teaches: place a part by what it does, not by what it sits on.

## 2026-10-01 · s5 · Wrap
Six guitars overnight, v6 to v11, each with a reel, an overlay on its own sheet and notes on what is drawn, judged and ours (README table). Waiting for Sam's review in the morning.

## 2026-10-01 · s5 review · Fix · Sawtooth edges were normals, not geometry
Sam on Sedge: rough, pixelated edges on the body, the rim looking patchy, the neck joint disconnected, the jack off centre.
- Edges: where the flat top or back meets the rounded edge, the shared vertices got an averaged normal, half tilted toward the edge. The cap's border triangles are all different widths, so that tilt shaded in a sawtooth. body_shell now writes each vertex's normal from the shape itself (the height function's slope on the caps, the quarter circle on the roundovers), so the shading follows the true surface. Fixed on all six, since they share the builder.
- Joint: the sheet's outline runs into the neck pocket, and my first cleanup cut it straight across in the wrong place, leaving slivers and a loose shoulder. The sheet also draws a dashed line under the neck where the body actually ends (the heel). The outline now follows that line, the neck butts into a pocket floor at 7.61 in, and the board runs on past it to the 22nd fret as the drawing shows.
- Jack: centred on the flat of the rim, between the maple edge and the back roundover.
Teaches: when edges look "pixelated" up close but the outline is smooth, check the normals before adding polygons.

## 2026-10-01 · s5 review · Fix · Creases, caps and a tenon in the wrong place
- Sedge's carve showed a jagged highlight, Scree's bevels a staircase. Both were creases (where a carve meets the flat, or two shapes meet) landing across mesh triangles. The top is now sampled on a fine grid, softened slightly, and built from a denser mesh. A real sanded bevel isn't a knife edge either.
- The 3+3 headstock ended in a flat dark patch: its outline was split into two edges at the wrong point, so the two sides never met at the tip. Split at the furthest point, they close cleanly.
- A light strip ran through Scree's guard between the pickups: the neck's tenon inside the body was built at fretboard height. It now stays below the surface.
- The black veneer was missing on one side of every 3+3 head: an outline with hundreds of tiny segments at the tip made the polygon fill give up halfway. Evenly spaced points fixed it.
Teaches: check a model from the angles a buyer would never look from, then fix the cause in the shared kit so every guitar gets it.
- Round 2b: the 3+3 head still showed a small flat patch at the tip (its last section was cut 0.004 in short of a rounded tip, still 0.13 in wide) and a dent in its side where the tuner housings below cut through the edge. Sections now run to 0.0004 in from the tip and are spaced finely along the whole head; the posts moved in so each housing sits under the head.

## 2026-10-01 · s5 review · Fix · Bevels as a band, not a chamfer from a polyline
Sam on Scree: still rough at the edges, the join with the neck "an accident of material", the horns chipped.
The first bevels fell in a straight line from each drawn bevel line to the rim. Drawn lines are polylines, so every little corner put a ripple in a glossy surface. Now each point of the rim takes a bevel width (its distance to the nearest drawn line), that width is smoothed along the rim, and the bevel is a band of that width with a softly rounded crest. Same drawing, clean reflections. The band fades out before the neck so the neck rises from a flat shoulder, and before each horn tip, where bands from both sides met in a creased ridge.
The horn tips were the other half: after "blunting" they were still 0.05 in points, which showed as a crease down the rim. Rounded to about 0.2 in.
Teaches: a glossy finish shows the second derivative of a surface. Anything built from straight segments needs smoothing before it goes under a clear coat.

## 2026-10-01 · s5 review · Fix · A cliff down the horn, and a head that wouldn't stop looking faceted
Sam on Scree, round 4: "we still have rough edges" on the head's sides, and on the body "depending on the angle" a sawtooth line down the bass horn, a fold at the waist and a kink in the rim near the tail.
- Body: I dumped the carve as a lit relief map and a curvature map (DUMP=... in build_scree.py) instead of guessing from renders. Two causes showed straight away. Each grid point took its bevel width from its single nearest rim point, so along the middle of a horn, where the nearest rim flips from a bevelled side to a bare one, the depth jumped: a cliff, which the mesh drew as a zigzag. And past the end of every drawn line the band kept widening (the distance to the line's last point grows), then stopped dead at 3 in, which made the round lumps and the step down the rim. Now each line marks only the rim it runs beside, eases out over an inch, and the bevel gets shallower as it narrows. Every point takes the deepest value any rim point gives it, which can't jump.
- Head: lofting the head in upright slices, the slices cut the angled, tapering head at a slant and its edges faceted however fine they were spaced. The head is now a plate cut from its outline with real rounded edges, like the body. Joining it to the neck took two tries. The plate is thicker than the neck behind the nut, so its square front end showed below the neck. Rounding that end off underneath made its corners fold over themselves. What worked: give the plate a rounded nose that sits hidden inside the nut and fretboard, round its front off underneath, and let the neck swell a little just behind the nut (a volute, as on real Gibsons) to cover it.
Teaches: when a glossy surface misbehaves, plot its curvature. The faults are bright lines on a black map, and the shape of the line tells you the cause.

## 2026-10-01 · s5 review · Fix · Making two shapes into one surface
Sam on Scree, round 5: the back of the head "feels weird how it's connected", one tuner looks like it floats, and the body still shows a few rough edges.
- Back of the head: the round neck and the flat head plate were simply overlapping, so where one surface came out of the other there was a crease, and the volute read as a long tongue. Now the neck's cross-section is morphed, section by section, into a copy of the plate's own cross-section a hair (0.004 in) bigger, held there, then shrunk just inside the plate. Where the two swap over they are parallel, so there is nothing to see. The plate's texture coordinates are also laid out the way the neck's are (along the neck, round the section), or the wood grain turned sideways at the swap.
- One check that saved time: a straight line across the head's back looked like a seam. Rendered with a plain grey material it was still there, straight and with a bright patch beside it: the reflection of a studio light's edge on a flat glossy surface. Not a defect.
- Floating tuner: measured, not guessed. Where the head is narrow, near the nut, the first pair of housings stuck out 0.15 in past its edge. Each housing is now kept 0.1 in inside the edge, and its shaft starts from the housing.
- Body: the top's triangles came from a square grid, which cuts across a bevel running round the rim at every angle, and a glossy finish shows that as a fine sawtooth. Near the rim the points are now laid in rows parallel to it (1.8 in deep), so the mesh follows the bevel.
Teaches: when two parts must read as one piece, don't overlap them. Make one become the other.
- Round 5b: Sam spotted two small patches either side of the volute. I measured instead of eyeballing: a debug pass (DBG_CONTAIN=1) checks every vertex of the head plate against the neck's cross-section at that point. 38 vertices stuck out, by up to 0.01 in, just past the nut, about 0.4 in either side of centre. Exactly his two spots. A slightly fuller neck section there and the count is zero on all three set-neck guitars. Teaches: turn "it looks off" into a number you can drive to zero.

## 2026-10-01 · s5 review · Fix · The guard that hung off the body
Sam asked whether Scree's guard matched the reference, since its top showed from behind. Honest answer: the small guard is ours (the SG plan draws the big batwing guard; swapping it was one of the brief's body changes), and it was wrong. Its top corners hung up to 0.2 in past the body into the cutaways, floating over the bevel.
Measuring why turned up a real bug underneath. The cutaway bevels next to the neck came out 0.65 in wide; the plan draws them 0.2 to 0.3. The drawn bevel lines are open curves, but the resampler closed every line into a loop, which added a straight chord from one end back to the other, right across the body and through a horn. Resampled open, and matched only to rim they actually face, the bevels came out as drawn, and the rest of the body looked exactly as before (compared side by side on the relief map). Then the guard's corners were redrawn to follow the flat of the top round the neck pickup.
Teaches: when something looks slightly off, the cause may be a quiet bug one layer down. Measure the thing against the drawing before redesigning it.

## 2026-10-01 · s5 review · Fix · Back to the drawings: the 1961 guard and the neck joint
Sam asked for the reference images before anything else, to compare himself. I rendered the SG sheets in the project to media/reference/. Side by side it was obvious the guard was mine, not Gibson's, and it read stiff. Sam picked the 1961-62 small guard from its own 1:1 sheet. Its outline and screw holes now come straight off that sheet, the tab between the pickups the way it sits on a '61. Every check passed first time: inside the body, clear of both rings, the bridge, the toggle and the knobs. That is what happens when a part comes from a drawing made for that body instead of being invented.
Then Sam asked whether the neck really joins the body like that. It didn't. On the plan the body's end is exactly the neck's width, and I had rounded its corners off in an earlier round, so the neck stood 0.1 in proud each side. The plans also label a neck heel, which we hadn't built. Both are back.
Teaches: show the reference early, and when a fix of yours fights the drawing, the drawing usually wins.

## 2026-10-01 · s5 review · Decision · Back to our own guard, drawn to balance
Sam compared v19 (the 1961 small guard, the neck heel) with v18 on screen and chose v18: our guard round both pickups, and the old joint. His note on the guard: unpolished lines, the space left and right should feel equal, and it would feel more premium if it followed the body's curves.
So the guard is no longer hand-placed points. It is built from what is around it: mirror-symmetric about the strings, the same margin both sides of each pickup, top corners that follow the cutaway bevels at a constant distance (measured off the carve, so they run parallel to the curve you see), and sides that echo the body's waist at a tenth of its change in width. Then it's smoothed with a method that doesn't shrink the shape (plain averaging pulled it in by 0.07 in and ate the margin).
Teaches: "balanced" and "premium" can be built rather than eyeballed. Derive each edge from the curve it sits next to.
A trap on the way: searching for where the top stops being flat, the empty cutaway beyond the rim also reads as flat, and the first guard ran out past the body. Walk outward and stop at the first point that isn't on the body.

## 2026-10-01 · s5 review · Fix · Moss: a wedge missing from the body, and contours that read as facets
Sam on Moss: rough edges on the back, the neck plate floating, a strange shape beside the neck from the front, and the arm contour "shaped at a weird angle, not one continuous motion".
- The neck plate wasn't the problem. Measuring it against the body showed the body itself was wrong: the outline had a wedge cut out beside the neck. Taking the neck pocket out of the sheet's outline, the extractor deleted every point in a box around it, and the box was a little wider on the treble side. On a Jazzmaster the treble cutaway runs into the side of the neck pocket, and from there the pocket wall *is* the body's edge, so the box ate the real edge. Closing the gap drew a straight chord diagonally across the end of the body. Cut at the pocket's own width and with that edge put back, the plate sits flat and the wedge is gone.
- The contours were built as a fall-off from one straight guide line each, so each read as a tilted plane meeting the edge at a crease. They are rim bands now, as on Scree, but with a rolled profile: level where they leave the top, steepening into the edge. The belly cut's guide line started out on the bass horn, so its band ran a little way, stopped and started again. That stop-start lit up as the zigzag in Sam's screenshot. It's defined now as one smooth swell of width along the bass rim.
- Measured with curvature maps again: two of the first fixes made it worse (one leaked the contour into the cutaway) and were backed out. The map is what showed it, not the render.
Teaches: when a part "floats", check what it sits on before moving the part.
- Round 7b: Sam's last Moss note was a step in the edge near the neck on both cutaways. The edge radius was switched from 0.3 to 0.12 in wherever a point fell inside a box round the neck, so the roundover jumped where the box edge crossed the rim. Now the radius grows with distance from the neck, smoothly, over an inch. Teaches: any parameter that changes along an edge needs to change gradually, or the change shows as a step.

## 2026-10-02 · s5 review · Fix · Fjord: a guard through a switch, and a top that looked like a grid
Sam liked Fjord's modelling but called out a "weird black blade" with something going through it. It was the floating guard I had drawn for KVELD, and I had laid it right over the toggle switch, so the lever came up through the plastic. A real 335's floating guard sits beside the switch. Sam's suggestion was to take it off, and the guitar reads cleaner without it.
The rough look on the top turned out to be mostly texture, not geometry. Zoomed in, the figured maple was a grid: grain as evenly spaced stripes along the body, flame as evenly spaced bands across it. Under a glossy coat the two together read as a checkerboard, which the eye takes as noise. The new figure has no repeating rhythm: grain as faint, broken lines of uneven strength, and flame as bands whose spacing, width and strength all wander, fading in and out in patches. It's an option on the shared texture builder, so Sedge and Rowan, already reviewed or waiting, keep theirs.
Teaches: anything procedural that repeats at an even interval will look like a pattern, not a material. Break every rhythm.

## 2026-10-02 · s5 review · Fix · Rowan: a binding cut by the neck, and parts that weren't earning their place
- Sam saw the white binding "cut" near the neck. The Les Paul's treble cutaway ends in a straight wall that runs alongside the neck for almost two inches, and the neck's side, tapering at its own rate, crossed that wall at a slant: just outside it at one end, just inside at the other. Where two surfaces cross like that, the one on top cuts the stripe on the other along a diagonal. Now the neck's side is held 0.004 in inside the wall over that stretch, so the binding runs unbroken to the neck.
- The floating guard came off, as on Fjord: Sam pointed out it made Rowan look like Fjord in another colour, which was a fair hit. A detail repeated across a range should be a signature on purpose, not a leftover.
- The back control cover had been drawn freehand round the four knobs, and from behind it read as a lumpy black hole. It now follows the knobs' own arc at an even width, with a rounded edge, gloss and screws.
Teaches: a part either earns its place or goes. "Remodel it or remove it" is a good question to ask of every invented detail.

## 2026-10-05 · s5 review · Fix · Heath: why the waist looked crushed
Sam on the last guitar: the back of the waist "feels like it was crushed", the arm contour looks cut with a straight edge, the curve by the neck isn't one motion, the connection at the neck feels off.
- The crush took four tries, and the first three fixed things that were wrong but weren't the cause. The cause: every body edge was a quarter circle, from the vertical side round to level. That is right on a flat back. On Heath the belly contour arrives at the rim sloping about 37 degrees, so the level end of the quarter circle met a sloping surface in a crease, and the mesh folded there. Now the rounded edge stops early, at the angle where it is tangent to the contour, so edge and contour are one surface.
- I also got the direction wrong once: I extended the arc past a quarter turn instead of stopping short, which made a raised lip round the whole rim. The render showed it immediately. Worth keeping in the video: the wrong sign is one character and it turns a fix into a new defect.
- The arm contour, a straight drawn line on the plan, was built as a tilt starting at that line, so it read as a flat cut. As on Moss it is a band along the rim now, as wide as the drawn line is from the edge, rolling from level to full depth.
- The notch by the neck: a 1/8 in rounded edge wrapped round a corner tighter than 1/8 in folds on itself. Smaller edge there, corner eased a touch (the neck plate sits 0.04 in inside it, so only a touch).
Teaches: when a fix doesn't move the defect, stop tuning it and ask what the geometry is actually doing at that spot.
- Round 10b: Sam still found Heath's waist distorted and asked to compare with the reference. The plan only draws where each contour starts, not how deep it is along the way, so I measured our rim instead: top, back and thickness every half inch. One row jumped out. Between two neighbouring samples the top fell 0.5 in and the back 0.3 in. The contour went to full depth as soon as it was 0.8 in wide, where a real one, cut on one plane, gets deeper only as it gets wider. Tying depth to width spread the same drop over three inches. Teaches: print the numbers along the edge. A table of thicknesses shows a kink that a render only hints at.

## 2026-10-05 · s5 wrap · Turning point · Scoring the hero once the seven guitars were in it
With all seven models approved, Sam asked me to grade the hero out of ten. I shot it fresh at 1440 x 900, 1000 x 575 and 390 x 844, with each guitar in the centre (`media/checks/judge-*.png`), and gave the models 8.5 and the hero 6.5.
- The hero was designed in session 3 around one guitar, Floe, pale on teal. Six more guitars exposed what that hid. Scree (dark body, saturated blue room) is nearly a silhouette. Fjord is green on green. The 3+3 headstocks are taller and touch the top of the frame.
- The text was placed over the scene, not in space kept free for it. The halo cuts through the headline's last letters and the lede, the model line crosses the halo and the neighbour's neck, the corner labels sit on the side plinths.
- The frame at rest has blown highlights on Floe's upper bouts. One second into the lift (scroll 1.2) the same guitar is a clean product shot: the walk dims the bloom, the hero doesn't.
- Under 900 px the headline and lede are hidden, so a phone never reads what the page is about.
Teaches: a hero tuned on one product has to be re-judged with every product in it. And grade from fresh captures at the sizes people use, not from memory of the build.
Before: `versions/v26/` and the `judge-*` stills.

## 2026-10-05 · s6 · Idea · Sam: the drawing should come first, and turn into the guitar
Looking at the cream drawing chapter, Sam asked for each of the seven to get its own outline with measurements, and for the flat drawing to stand up into a 3D object and fill into the real model as you scroll. He chose "drawing first": the drawing is the way into each guitar, where the walk's lift was. The page already did the opposite (the walk ended with the guitar laid flat over its drawing), so this turns the story round: drawn, built, inspected.

## 2026-10-05 · s6 · Options · Drawing first, three treatments
Switch: `?draft=ink|stack|dark` (add `&g=rowan` to open on a guitar). Code: site/src/draft-options.js, one hook in main.js. Reels: demo/draft/draft-options-desktop.mp4 and -phone.mp4, recorded on Rowan at 1000 x 575. Before: the 00 Now clip, and versions/v27/ has the page with the options but the old hero.
- 01 Ink on Paper: the room goes out, a cream sheet comes up, the plan is inked with its dimensions, stands up into section lines, and the finish spreads out from the bridge with a wandering edge.
- 02 Contour Stack: the plan's height lines peel off the sheet into a stack of slices, pulled apart to nearly three times their height, then settle as the solid grows up through them with the wood showing in the cut.
- 03 Lights Down: no sheet. The plan is drawn in the guitar's colour over the plinth, turns in the dark, and the guitar arrives from the tail with a lit edge.
Not built: the guitar un-building itself back into lines on the way out; a version with the whole ring as drawings.
How it works, the parts worth a video:
- Nothing was traced. The lines come from the same json each Blender build writes (outline, neck, frets, pickups, and on Rowan the twelve height lines of the carve).
- A line knows how high to rise because the model is rendered once straight down into a float texture: one height per millimetre. Every point of the drawing looks its height up there, so the ink lands on the real surface to the millimetre. The section lines and the contour slices are cut from the same two maps (top and underside), the slices with marching squares.
- Set necks lean their headstock back, so seen from above the head is 3% shorter than on the flat sheet. The drawing is shortened by what the model measures, or the outline overshoots the head.
- The model arrives through a cut added to every material: fragments past a moving measure are dropped. Out from a point, up through the depth, or along the length are the same three lines of shader with different numbers.
- Lines with a real width are quads built in the vertex shader (WebGL draws lines one pixel wide whatever you ask for).
- The frame is tone mapped after the bloom, so "cream" has to go into the scene as the value that comes out cream. The ACES curve is inverted in a small loop for the paper and both inks.
Teaches: build the option from data you already have and it stays true for all seven. And when two things must line up (a drawing and a model), measure one from the other instead of matching by eye.
Bugs on the way: the lines were invisible at first (the quads were wound clockwise and culled); the first cut-face colour showed on the knobs because the build exports every material two-sided, so "is this a back face" could not tell an inside from an outside.

## 2026-10-05 · s6 · Turn · Hero from 6.5 toward 9 (Sam: "turn it into at least a nine")
What changed, in the real page (before: versions/v27/, after: versions/v28/, reels demo/v3/hero-v3-*.mp4):
- The glow that flooded the room was bloom from the halo. The halo is now a hairline set further back, and the room at rest uses the walk's cleaner bloom. Each finish shows in its own colour again.
- The rims are held to half at rest: square on, they burned the rounded edges of a body white.
- The other six wait in the dark and wake while the ring turns (`wake` in showroom.js), so the room belongs to the guitar in front and still comes alive when you move it.
- Scree's slate finish read as a cut-out in a dark room. Dark finishes get more key light while they stand in the centre (`light` in data.js), and none on the walk, where each stop was tuned.
- The copy no longer sits on the scene by luck. main.js measures where the halo lands on screen and sets the two column widths, and the type sizes follow the columns.
- The selector moved to the right edge as one block: steps either side of the count, the name as the largest type in the room, three facts stacked, the way in.
- Phones show the headline (it was hidden under 900 px) and carry the selector over the plinth.
Teaches: when a scene looks tinted, find what is bleeding before turning colours down. Here it was one bright object and a wide bloom.

## 2026-10-05 · s6 · Fix · View guitar showed Floe's sheet for every guitar
Sam's screenshot had Rowan on the stand next to "01 · Floe, swamp ash, white blonde". The panel was written when Floe was the only real guitar and never made data. Now each guitar has its sheet: figures from its own json (they count up), materials and finish from site/src/specs.js, and a line on what KVELD changed from the instrument it is drawn after. The guitar turns slowly on the stand while nobody drags it, and "Walk the guitar" goes straight to the first stop. Reels: demo/v3/panel-v3-*.mp4.
Teaches: anything hard-coded while there was one product is a bug waiting for the second.

## 2026-10-05 · s6 · Assets · Product stills straight from the models
The sections below the room had no pictures of the guitars. tools/product_shots.mjs renders each GLB with the viewer's studio light on a transparent background and writes WebP stills into site/assets/shots: a three-quarter view, a close view of the body, and a straight-on view with an orthographic camera at the same pixels per metre for all seven, so they compare true to size. 21 files, about 1.1 MB. tools/room_still.mjs takes the wide picture of the whole room.

## 2026-10-05 · s6 · Options · Section 02, three ways to choose a guitar (Sam scored the list 3)
Switch: `?index=wall|stage|bench`. Code: site/src/index-options.js. Reels: demo/index/index-options-*.mp4.
- 01 The Wall: a pinned row that travels sideways, one tall card per guitar (number, still, three facts, price, way into the room), the still and the number moving at different rates.
- 02 Spotlight: seven names on the left; scrolling moves the light down the list, and the guitar, its outline and its sheet change on the right.
- 03 To Scale: the seven on a cream sheet at true size, hung at the bridge, with lines where each scale length puts the nut. The light goes along the row and the others fall back to their drawings. Six chips narrow them (coils, scale, semi-hollow).
Prices and build times are invented (specs.js), to make the section sell something.

## 2026-10-05 · s6 · Options · The footer, three (Sam scored it 2)
Switch: `?footer=light|strings|ticket`. Code: site/src/footer-options.js. Reels: demo/footer/footer-options-*.mp4.
- 01 Last Light: the whole room as the last picture, dark and close on arrival, opening up as it fills the screen.
- 02 Open Strings: six strings across the page, each a sum of five standing waves mixed by where it was plucked. Sound is a plucked-string model rendered once per string, off until asked for.
- 03 The Ticket: a paper appointment card with a stamp. Nothing is sent.
Recorded from versions/v29/; the end of the night is versions/v30/.

## 2026-10-06 · s6 · Turn · Sam takes the hero back
After a night with hero v3, Sam: "go back to the previous version. I feel there was more light, so it feels more premium." The hero's light, halo, camera, neighbours and layout are back exactly as they were (the files match versions/v27 again). What stays from that night: the View guitar sheet, the header that steps aside, the copy fixes and the three option sets. Hero v3 is kept in versions/v30 and in demo/v3/hero-v3-*.mp4.
I had marked the glow down as "gaming neon" and the brief's word was "quiet". Sam reads that same glow as premium. Teaches: a critique list is a set of guesses about taste until the person whose page it is has watched both versions. The before/after reel is what made this a one-line decision.

## 2026-10-06 · s6 · Direction · Spotlight is section 02
Sam, with a screenshot of `?index=stage` on Sedge: "apply this option to our actual landing page." Seven names on the left, the one in the light on the right with its outline, its sheet, a price and the way into the room. The other two options and the switch are gone (kept in versions/v29 to v31 and in the reels in demo/index).
Making it real changed three things worth showing:
- The demo pinned the section with ScrollTrigger. With reduced motion on, the page runs without Lenis, and ScrollTrigger then measured everything below the pinned room 8,798 px too early (the length of the walk), so the section sat blank. A single trigger refreshed on its own measured right, a full refresh did not. I stopped depending on it: the section is 4.4 screens tall, its content is `position: sticky`, and the step comes from the section's own box each frame. Less code, and nothing to get out of order.
- In the demo the stage kept Floe's colour for every guitar once it was the real section: one CSS line set the colour variable on the stage itself, which beat the value coming down from the section. A custom property declared on an element always wins over one inherited from its parent.
- A hover now previews a guitar and leaving the list returns to where the scroll is. A click goes to that guitar in the room. On phones only one name shows, so seven dots say where it is in the list.
Teaches: a demo is allowed to lean on the page's happy path. Making it real means running it the other ways people arrive: reduced motion, a phone, no pointer.

## 2026-10-06 · s6 · Fix · A stale browser made a correct revert look wrong
After the hero went back, Sam's tab showed a broken mix and he took it for the wrong hero. `python3 -m http.server` sends no cache rules, so Chrome reused yesterday's stylesheet and modules with today's markup. A hard refresh request was not enough and a "clear cache" response header did nothing in a test. What works on an ordinary reload: the page itself is always refetched, so give every file a new address there (`?v=N` on the stylesheet and entry script, and an import map entry per module). tools/serve.py also tells the browser to check each file every time.
Teaches: when someone says "that's not the version", look at what their browser actually requested before touching the code. The server log had the answer: one request, for the page alone.


## 2026-10-06 · s6 · Direction · Ink on Paper and Last Light are the page
Sam, with a screenshot of `?draft=ink&g=rowan`: "apply this option for the drawing." Then, with one of `?footer=light`: "apply this footer." So all three rounds of session 6 are decided: Ink on Paper, Spotlight, Last Light. Before: `versions/v32` (the switches still work there). After: `versions/v33`.
What changed in making them real:
- The ink chapter replaced the cream chapter that plotted Floe's plan, so "Drawings" in the header had nowhere to go. It now scrolls to the moment the plan is fully inked, inside the pinned room. The cream chapter stays in the markup as the fallback for reduced motion and no WebGL, and is removed at boot when the ink chapter runs.
- The footer's styles moved out of the options file into the stylesheet, and the file kept only the option that won.
Teaches: a pick is not done when the switch is deleted. Every link that pointed at the section it replaced has to be walked again.

## 2026-10-06 · s6 · Fix · The guitar's head under the header
Sam: "the guitar is cropped a little bit on the top and there's no spacing with the name and the tabs." The seven guitars are between 1.14 and 1.165 m tall on their plinths and the camera was framed for the shortest. On Moss the head ran under the header row and out of the window.
Fix: `layout()` computes where the tallest head lands and opens the lens only as far as it takes to leave the header row free, with a small lift of the camera so most of the room comes from moving the picture down, not from zooming out. 22 degrees became 23.9 on his window.
Also out: "Open by appointment" and the coordinates in the bottom left. He did not want them in the hero (they are still in the footer).

## 2026-10-06 · s6 · Technique · A plectrum for a pointer
Sam asked for "a nice custom mouse pointer related to the landing page". It is a pick: a rounded triangle drawn as one SVG path, turned 30 degrees so its tip sits exactly where the arrow's tip would. It follows the hand with a short lag and leans with the hand's speed, fills with the centre guitar's colour over anything you can press, says Drag over the room (the ring turns under the hand and nothing said so), shrinks when pressed, and is drawn in ink while the cream sheet is up. It only replaces the native pointer after the first mouse move, and never on touch.
Built with: `site/src/cursor.js`, one `gsap.ticker` callback, `document.elementFromPoint` four times a second for the state.
Teaches: a custom pointer has to keep the two things the arrow does well. One exact point, and a clear sign of what can be pressed.

## 2026-10-06 · s6 · Process · 34 folders become five commits
Sam counted the frozen copies: 34 folders, 1.2 GB, one per round of fixes. He wants a version to mean an iteration ("a section or a redesign"), and a repo he can hand to people when he teaches. So the folders were folded into a git history of five commits on `main`, tagged `v1` to `v5`: the first page, KVELD and the hero on glass, the walk, seven guitars, the page around them. Four side tags keep what was built and not chosen (the hero options, Scree's 1961 guard, the unpicked section options, the darker hero).
How: the history was assembled in a scratch folder by laying each chosen folder over `site/` and committing it with the date it was made, so the live page was never touched. Then `.git` was moved into the project and every tag was exported and compared with the folder it replaces before that folder went to the Trash. All nine matched.
Left out of the repo on purpose: the licensed plan sheets, the overlays that show their ink, and every video.
Teaches: version numbers are for the reader. Thirty-four of them told nobody anything, and Sam could not find "the one before yesterday" among them. Five with names tell the story of the build.

## 2026-10-06 · v6 · Turn · The same numbers, told four times
Sam, looking at the page as a visitor: "When we click we view the guitar, but it feels like the same spec when we scroll, where we have the traced guitar with all the measurements. What do you think about that?" He was right. I counted: the scale length shows up in the hero line, in the View guitar sheet, on the inked plan, in the close-up headlines and in Spotlight. The four big counting figures in the sheet (scale, frets, radius, nut) are exactly what the drawing inks a few seconds later.
The rule we took for V6: one job per section. The drawing owns the measurements. The click is the guitar in your hands (turn it, what it's made of, what's ours, what it costs). The close-ups talk about what's on screen. Spotlight compares the seven.
Teaches: each section was built in its own round and each one was good alone. Nobody had read the page top to bottom as one visitor. Do that before polishing any single section further.

## 2026-10-06 · v6 · Direction · The View guitar sheet sells instead of measuring
Step 1 of 3. The four figures are out of the sheet. In their place: the price, the build time (both still count up) and a Book a visit button. Materials, "Ours, not the sheet's", the free turn and Walk the guitar stay.
Two small things worth showing:
- Book a visit has to reach the footer, which is about twenty screens below, past the drawing and the whole close-up tour. A smooth scroll would race through all of it. So the page goes dark for half a second, jumps, and comes back up on the footer.
- A number that counts up changes width while it counts (€0, €87, €1,240) and pushes its neighbour sideways. Each number is given its final width before the count starts.
Before: tag `v5`. Reel: demo/v6/sheet-v6-desktop.mp4 and -phone.mp4 (re-record with `sh demo/v6/record.sh before|after`).

## 2026-10-07 · v6 · Turn · View guitar gets a real camera move
Sam, with a screenshot of the sheet on Floe: "When we click View guitar the movement is so subtle and minimal. Make the transition more cinematic. The guitar at a nice angle, just focusing on the body, and the body can rotate really slow, so it doesn't make a complete turn. I just want the movement and the lighting shining on the material. The arch can still glow. The right side is too compressed." He also wanted Walk the guitar out of the sheet (it already comes after the drawing, twice is confusing) and a way to change guitar without going back to the room. Target he set: at least 8 out of 10.
Something his screenshot told me that he did not say: his window is about 1725 px wide, and the sheet was capped at 440. A quarter of the screen for all the words. I had been checking at 1000 px, where the same sheet took 40 percent and looked fine.
Before: demo/v6/closeup-v6-desktop.mp4 and -phone.mp4 (first clip of each).

## 2026-10-07 · v6 · Technique · The body portrait
What the click does now. The guitar lifts 8 cm off its plinth and leans 15 degrees about the middle of its body. The camera comes in until the body fills the height, and a lens shift (an off-centre projection, the same trick the close-up tour uses) slides the picture to the left without changing the perspective. The arch is moved and shrunk so that from this camera it closes round the body like an iris. It rests turned about 45 degrees and sways 7 degrees either side over 14 seconds. It never turns fully on its own, dragging still does.
The framing is the same for all seven. That is what makes changing guitar from the sheet work: the camera stays put and the ring turns under it, so the next body slides into the same light. The seven names sit along the bottom, and the arrow keys work too.
The sheet takes 43 percent of the width and its type grows with the window.
Built with: `CLOSE` and `closeTo()` in site/src/showroom.js, section 3 of site/src/main.js, "close-up state" in styles.css.
Teaches: a product page has one camera per job. The room shows seven things at once. The portrait shows one, and everything else in the frame (arch, plinth, dust) is there to point at it.

## 2026-10-07 · v6 · Fix · The flare that was not the key light
Half way through its sway each guitar's edge burned into a white blob, worst on Fjord. I blamed the key light and the bloom, in that order, and tried three bloom settings and two key positions. None of them moved it. Then I measured instead of guessing: a script turned each of the seven through 19 angles in the close-up and counted near-white pixels on the guitar. Every guitar blew out between 0.40 and 0.65 radians and was clean either side. Switching lights off one at a time found it in two runs: the two rim lights behind the guitar, mirroring off the top straight into the lens. The key light had nothing to do with it.
Fix: the guitar rests at 0.8, past the band, and only crosses it on the way in, which reads as one flash of light across the finish. Pale and dark finishes also get their own light level up close (Floe 0.78, Scree 1.7), because one setting blew out the white one and lost the slate one in the dark.
Teaches: when a highlight misbehaves, count it across the whole range before touching a setting. And suspect the lights behind the subject first. A rim light at a grazing angle is the brightest thing in the room.

## 2026-10-07 · v6 · Direction · The body portrait stays
Sam, after watching the before and after reel: "This is just awesome." No changes asked. The close-up, the wider sheet and the seven names in the sheet are the page.

## 2026-10-07 · v6 · Turn · Section 02 follows the pointer, not the scroll
Sam, scrolling into the list of seven: "When we scroll it switches through all the guitar models, 01 to 07. That's not exactly what I want. It should be selected as we hover on it, and not by scrolling."
The section used to hold the page for 3.4 screens and step through the guitars. That was built so it would work without a pointer, and it did, but it also took the choice away from the person choosing. Now it is one screen. Pointing lights a guitar and it stays lit. Phones get taps on the dots and a swipe across the guitar.
Before: demo/v6/lower-v6-desktop.mp4, first clip.
Teaches: scroll is for telling a story in order. A list of things to pick from has no order, so driving it with the scroll makes the visitor sit through six guitars they did not ask about.

## 2026-10-07 · v6 · Fix · "In the room" went to the wrong end of the room
While testing the new section I clicked "In the room" and the page moved up one screen and stopped on the guitar lying flat. The code scrolled to `#room`. But the room is pinned for twenty screens, and a pinned element sits at the END of its pin once you are past it, so "scroll to the room" meant "scroll to the last frame of the tour". It had been like that since the section was built. Nobody caught it because the demo recordings never pressed that button from below.
Fix: go to the top of the page, through the same half-second fade to black that Book a visit uses, with the ring already turning to the chosen guitar.
Teaches: with a pinned section, "where is this element" has two answers. Scroll to a number you computed, not to the element.

## 2026-10-07 · v6 · Direction · The footer, tidied
Sam's notes on Last Light: no names over the picture, no note about the fictional maker, a quieter reflection in the floor, a smaller headline, "some movement" on the middle guitar ("like the particles fading into the black"), a cleaner CTA, and under the guitars the things a real company has: contact, social, hours, a way to send a text.
What went in: Book the room alone on the right. A band of four columns under the guitars (the room, hours, need info, follow). Dust that rises through the centre light and fades out on the way up, drawn on a small 2D canvas laid over the picture, plus a slow breathing glow. The picture itself was re-rendered with the floor's mirror at 0.6 instead of 1.25.
One thing I added without being asked: the footer now takes the colour of the guitar in its picture (Moss green). It used to take the colour of whichever guitar the room was left on, so the word "played" could be ice blue under a green light.
How the dust stays on the guitar: the picture, the glow and the canvas share one box with the picture's own proportions, and that box is what gets zoomed. So nothing has to be measured in script.

## 2026-10-08 · v6 · Fix · Five tools that borrowed a library from another project
The capture tools (`stills`, `inspect_shots`, `product_shots`, `room_still`, `tune_turns`) drive headless Chrome with playwright-core. They never had their own copy. Each one loaded it from the Cupola project by its full path, because it was already installed there. Then Sam tidied his folders and Cupola moved out of `Random Demos`. Nothing in this project changed, and all five tools stopped working.
Fix: the project has its own copy now, in `tools/node_modules`, with a `tools/package.json` that names the version (1.62.1). The tools find it from their own location (`createRequire(import.meta.url)`), so the project can be moved or renamed too. Checked by running `stills.mjs` against the local server: it rendered the room.
Teaches: a full path to another project is a hidden dependency. It works until someone renames a folder, and the thing that breaks is nowhere near the thing that moved.

## 2026-10-23 · v6 · Wrap · V6: the guitar up close, and a lighter page
What changed since `v5`: the View guitar sheet sells instead of measuring, View guitar became a body portrait with the seven names to change guitar in place, section 02 follows the pointer, the footer carries the room's details and dust in its light, and a performance pass took the page from 60 MB to 10 MB and from about 25 to 60 fps on Sam's Retina screen. Sam, after seeing it: "I like, let's push it."
Before: tag `v5`. Reels and stills: `demo/v6/`, `teach/shots/v6-*.jpg`. Still open for V7: the walk's copy and ending (see BRIEF-v7.md).

## 2026-10-23 · V7: the hero fix and the workshop round

- Hero, Sam's notes: arrows into the halo, dots out, name and View guitar under the guitar. Technique worth a lesson: project 3D points to the screen every frame (`heroAnchors()`) and stand DOM on them. The arrows ride the halo's line with the pointer parallax but not with the camera's pull-back on a turn, so they never move away from under a click. Three looks for the arrows were rendered side by side as stills before choosing (the bead of light won).
- Sam asked "is any section missing?" before building. The diagnosis that mattered: the hero and 02 do the same job (pick one of seven), so 02 can only send you back up. Proposed: sound, the workshop, how to order.
- Workshop round, three options behind `?shop=`. The strongest technique: the guitar assembled from its named GLB parts on a bench, with the finish as a shader sweep (raw colour ahead of a moving plane, the real material behind it, a wet edge at the line) and the saw as a clipping plane through two box blanks. Then the same scene rendered the gallery option's pictures, so one build gave two options.
- Before: `teach/shots/v7-hero-before.png`, after: `v7-hero-after.png`. Reels in `demo/v7/`.


## 2026-10-31 · V7 final · QA · The audit before the fixes
Before touching anything: stills of every part at 1725 x 990, 1000 x 575, a phone and reduced motion, recordings forwards, backwards, a hard flick, then the type and every button read back from the DOM (`tools/type_audit.mjs`). A blind judge got only the captures. It scored lower than I did on most things and it was right more often than not. The numbers did what opinion could not: 21 label combinations, 9 of 17 controls with both states.
Teaches: score before you fix, write it down, and let someone who did not build it look.

## 2026-10-31 · V7 final · Teachable bug · Reduced motion and a 0.01 ms transition
The common reduced-motion reset, `transition-duration: 0.01ms` on everything, also applies to a pin's spacer. ScrollTrigger sets the spacer's padding and measures in the same frame, while the padding is still "transitioning", so every section after the room was placed as if the room had no pin. The workshop landed in the middle of the tour. Fixed with `transition: none`.
Teaches: a global reset is not neutral. A page nobody tests in a mode is broken in that mode.

## 2026-10-31 · V7 final · Teachable bug · The hitch on a ring turn
430 ms after each change of guitar. A CPU profile named it in one run: `Object3D.copy` and `toDataURL`. three's `clone()` copies userData through JSON, the guitars keep their mesh lists in userData, and Texture has a toJSON that paints to a canvas. Setting userData aside for the copy took the long task from 383 ms to none.
Teaches: profile, do not guess. I had first rewritten the bounding boxes, which was a real saving and not the cause.

## 2026-10-31 · V7 final · Technique · One move for every hand-off
Sam's workshop rise is now `riseOver(next, prev)` in `handoff.js`: the section before holds a screen longer, the next has a negative margin of one screen, its corners flatten with `--rise`, the one under it sinks with `--sink`. Four hand-offs, one helper, one curve (the scroll).
Before: `demo/qa/before/rec-forward.mp4`. After: `demo/qa/after/rec-forward.mp4`.

## 2026-10-31 · V7 final · Technique · A slip that draws the guitar
How to order keeps Sam's slip and takes the page's language: the plan is plotted from the same data as the drawing chapter, in steps timed to the words (trace, measures, frets and finish, strings), the tour's ruler runs down it, and the highlighter became a dimension line. Pointing at a row makes the slip out for that guitar with its real weeks and deposit.
Teaches: "make it feel more ours" usually means reuse what the page already taught the visitor, not add a new idea.

## 2026-10-31 · V7 final · Technique · Sound with no ears
Everything is synthesized from the Hear them string model and noise, on one audio context. Pen and saw are noise loops with the texture baked in (grains for a nib, teeth for a blade), then gain and filter follow the scroll's speed, so it runs backwards too. To check it without being able to hear: take the real output off the bus with a MediaStreamDestination into a MediaRecorder while Chrome stays muted, then read peak, RMS and LUFS per section, and look at the spectrogram. Sam still has the last word: `LEVEL` at the top of `ambience.js`, or `?ambience=1.4` in the address.
