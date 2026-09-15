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
| `pitbull-road.png` | the creature on the road at golden hour, GPT Image 2.5 from the pfp crop (the full reference is refused by moderation; the head-and-arms crop passes) | 1344×752 | Magnific |
| `COPY.md` | X bio, launch posts, video script, prompt plan | — | written |
| `posters/banner.png/.jpg` | X banner: the creature left, "$PITBULL", tagline, chain pill | 1500×500 | `posters/banner.html` over the reference, rendered with `scripts/render_poster.mjs` |
| `posters/post1-meet.png/.jpg` | post 1 "Meet the Pitbull" | 1920×1080 | HTML/CSS over the reference |
| `posters/post2-prophecy.png/.jpg` | post 2 "The Prophecy" (seven signs) | 1920×1080 | HTML/CSS over the reference |
| `posters/post3-star.png/.jpg` | post 3 "A Rising Star" (stage light, confetti, DALE.) | 1920×1080 | HTML/CSS over the reference |
| `video/pitbull-hype.mp4` | H3 hype video: stands, walks in, double-biceps flex with dust, holds; sound, no end card | 1344×768 24 fps, 10 s | Minimax H3 from `pitbull-road.png` |
| `geo/banner.png/.jpg` | X banner, Geocities style: cloud tile, faint tiled faces, WordArt title, Win95 bevel frames, NEW! burst, sparkles, visitor counter, construction stripes | 1500×500 | `geo/banner.html` + `geo/geo.css` (the style sheet the site will reuse), rendered with `scripts/render_poster.mjs` |
| `geo/meme1-chart.png/.jpg` | meme: MS Paint chart only goes up, creature standing on it, "THE CHART WATCHES HIM" | 1200×1200 | `geo/meme1-chart.html` |
| `geo/meme2-warning.png/.jpg` | meme: Win95 dialog "You are holding 0 $PITBULL" with BUY / "I like being poor" | 1200×1200 | `geo/meme2-warning.html` |
| `geo/meme3-beforeafter.png/.jpg` | meme: before (small, grey, $4.12) vs after (gold, dollar rain, DALE.) | 1200×1200 | `geo/meme3-beforeafter.html` |
| `geo/cutout.png` | the creature on transparent background, alpha-trimmed | 490×664 | Magnific background removal on `pitbull-road.png` + `scripts/trim_alpha.mjs` |
| `geo/geo-fx.js` | shared chaos helpers: seeded dollar/coin rain with keep-clear regions, sparkles, MS Paint candle chart | — | written |
| `geo/wealth1-blessing.png/.jpg` | wealth: god rays, coin heap, "HE BRINGS WEALTH" + the legend on a scroll | 1200×1200 | `geo/wealth1-blessing.html` |
| `geo/wealth2-jackpot.png/.jpg` | wealth: FORTUNE.EXE slot machine on $ $ $, "you didn't win, you were chosen" | 1200×1200 | `geo/wealth2-jackpot.html` |
| `geo/wealth3-transfer.png/.jpg` | wealth: WEALTH.EXE transferring a fortune, 420% complete, mail from the Pitbull | 1200×1200 | `geo/wealth3-transfer.html` |
| `video/pitbull-hype-geocities.mp4` | hype video: the H3 footage inside a Netscape window with the full Geocities chaos on top (popups, falling money, marquee, taskbar, WordArt slam, DALE stamp), H3 audio | 1920×1080 30 fps, 10 s | `geo/video-chaos.html` recorded with `scripts/record_video.mjs` |
| `geo/hype.webm` | VP9 copy of the H3 clip (Chromium for Testing has no H.264, so the page needs webm) | 1344×768 | ffmpeg |
| `geo/og.png/.jpg` | link preview card (also `web/public/assets/og.jpg`) | 1200×630 | `geo/og.html` |
| `geo/post-shrine-open.png/.jpg` | post: the live site inside a Netscape window, "THE SHRINE IS OPEN" | 1200×1200 | `geo/post-shrine-open.html` over `geo/site-shot.png` |
| `geo/post-prophecy.png/.jpg` | post: the seven signs as a PROPHECY.EXE table | 1200×1200 | `geo/post-prophecy.html` |
| `geo/post-getchosen.png/.jpg` | post: how to get chosen in 4 steps | 1200×1200 | `geo/post-getchosen.html` |
| `gif/pitbull-money.gif` | 4 s loop: god rays, falling money, DALE. blink, scrolling bar (`.mp4` uploads cleaner on X) | 480×480 12 fps | `geo/gif-money.html` recorded with `scripts/record_video.mjs` + `scripts/togif.sh` |
| `geo/site-shot.png` | screenshot of the live site, used inside the post frame | 1280×800 | Playwright on thepitbull.fun |
