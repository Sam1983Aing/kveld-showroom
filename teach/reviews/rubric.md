# KVELD QA rubric (2026-10-31)

Target from Sam: "reach close to 9.5 out of 10 for the final version". Every item scored on its own, nothing averaged away.

**Benchmark:** Awwwards Site of the Day WebGL product pages and Apple product pages: a page you would believe a top studio spent months on. Nothing that reads as a template or as generated.

**Anchors:** 10 something you would study. 9 a trained eye finds almost nothing. 8 polished and intentional, minor nits. 7 good, one noticeable flaw. 6 acceptable, visible rough edges. 5 the idea is there, the execution distracts. 3 to 4 clearly broken in places.

**Each section out of 10** (0 to 2 points each, half points allowed):
1. **Concept reads:** you get what is happening and it could only be this brand.
2. **Motion:** smooth, physical, in the page's language, forwards and backwards.
3. **Type and layout:** hierarchy, spacing, the shared scale, nothing collides.
4. **Robust:** right at 1725 x 990, 1000 x 575, phone, a wider window, after a resize.
5. **Finish:** details, copy, hover and focus, nothing generic.

**Cross-cutting items** use the same anchors. Measured where possible:
- type and spacing: distinct label size and tracking combinations read back from the DOM (`tools/type_audit.mjs`)
- hover and focus: buttons and links with both states (`tools/type_audit.mjs`)
- performance: 60 fps at 2x at 1725 x 990 in every part, no frame over 50 ms (`tools/perf.mjs`), GPU busy (`tools/gpu_busy.sh`)
- sound: peak, RMS and loudness per section against Hear them's phrases (`tools/ambience_render.mjs`)

Scores are judgements. Never rounded up to reach the bar.
