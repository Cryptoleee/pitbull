# Brand assets

Style lock: **photoreal**, not the flat cartoon of Plantoshi. The reference is the creature image supplied
by the project owner (`pitbull-ref.png`, to be added): a muscular grey-brown pitbull body on a gravel
desert road, a bald human head with goatee and gold aviators, tan bull horns, floppy dog ears, two human
bodybuilder arms in a double-biceps flex, pale blue desert sky, scrub, distant mountains. Every generation
passes that image as a reference; the palette is desert sand, tan, gold and sky blue, text in the site's
gold (#e2a63a) on near-black (#0d0b08).

| File | What | Size | How |
|---|---|---|---|
| `pitbull-ref.jpg` | the reference creature, supplied by the owner | 2048×2048 | upload |
| `pitbull-pfp-crop.png` | pfp crop of the reference (head, horns, arms) | 1024×1024 | Chromium canvas crop |
| `COPY.md` | X bio, launch posts, video script, prompt plan | — | written |
| `posters/banner.png/.jpg` | X banner: the creature left, "$PITBULL", tagline, chain pill | 1500×500 | `posters/banner.html` over the reference, rendered with `scripts/render_poster.mjs` |
| `posters/post1-meet.png/.jpg` | post 1 "Meet the Pitbull" | 1920×1080 | HTML/CSS over the reference |
| `posters/post2-prophecy.png/.jpg` | post 2 "The Prophecy" (seven signs) | 1920×1080 | HTML/CSS over the reference |
| `posters/post3-star.png/.jpg` | post 3 "A Rising Star" (stage light, confetti, DALE.) | 1920×1080 | HTML/CSS over the reference |
| `posters/endcard.png/.jpg` | video end card | 1920×1080 | HTML/CSS over the reference |
| `video/pitbull-announcement.mp4` | hype announcement video, 12.5 s, H.264, silent | 1920×1080 30 fps | `posters/video.html` recorded with `scripts/record_video.mjs` (Chromium + ffmpeg) |
