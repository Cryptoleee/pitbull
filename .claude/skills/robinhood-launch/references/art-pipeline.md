# Art and motion pipeline (Magnific: GPT Image 2.5 + Minimax H3 + ffmpeg)

## Style lock

The house style: **flat cartoon sticker art, thick black outlines, flat saturated colors, subtle paper
grain, kawaii faces, sky-blue sky, pink clouds, smiling sun, wavy brown soil strip**. Lock it once per
project: generate the mascot (pfp) and one hero scene, publish them on the site (`/assets/...`), upload
those public URLs with `creations_upload_image`, and pass both as `references: [{type: "image", identifier}]`
on every later `images_generate` call. Say in the prompt: "keep the mascot identical to Image 1, use
Image 2 for palette and style only". Consistency comes from the references, not from adjectives.

Model: `mode: "gpt-2-mini"` (GPT Image 2.5) for every still. Ratios: `16:9` (posts, video frames), `3:2`
(announcement), `1:1` (pfp, GIF frames), `3:1` for the X banner is not offered, generate `16:9`/`21:9` and
crop. Put every literal text in double quotes with a role (headline / pill / footer) and end with
"exactly this text and nothing else, no watermark". Ask for `count: 2` on hero pieces, `1` on the rest.
Renders come back 1344x752 (16:9); upscale with Lanczos to 1920x1080 for JPGs, it is flat art.

## Asset checklist (in production order)

| Asset | Ratio / size | Notes |
|---|---|---|
| pfp | 1:1 | mascot bust, three variants, pick one, it becomes Image 1 |
| banner | 3:1 (crop from 21:9) | mascot + scene + name |
| announcement | 3:2 + 1920x1280 JPG | name, "launching soon"/"live", `$TICKER on Robinhood Chain`, url |
| og image | 1200x630 | the announcement cropped |
| teaser(s) | 16:9 | one hook per image, no whale unless asked |
| explainer video | 16:9, 20 s | two chained H3 segments |
| GIF pack | 1:1, 7 s each | thumbs up, flower burst, wave, rain, rocket, wilt-and-revive, disco, community |
| deep-dive infographics | 16:9 | "how it works", "every trade changes the weather", "from seed to space" |
| community call | 16:9 | crowd of mascots, "join the ... community" |
| stream thumbnail | 16:9 -> 1920x1080 | LIVE badge, launch party, url |
| end cards | 16:9 | "url · buy · hold · grow" and a "we keep growing" poster |
| sticker sheets | 16:9 on pure white | pill labels with icons, cut with `scripts/key_stickers.py` |

Every asset: PNG + JPG in `brand/`, one README line (what, size, how it was made), commit, push.

## GIF pipeline (7 s, 1:1)

1. `images_generate` 1:1 start frame with the references (pose, props, empty space for the motion).
2. `video_generate` with `slug: "minimax-video-3_0"`, `duration: 7`, `resolution: "768p"`, `aspectRatio: "1:1"`, `keyframes.start = {type: "image", url: <creation identifier>}` and an H3 prompt (below).
3. `creations_wait` (retry on Cloudflare 502), download with `scripts/dl.sh`, `scripts/togif.sh in.mp4 outbase` (512 px, 15 fps, palette, loop).
4. Review `scripts/tools.sh sheet in.mp4 sheet.png` (10 frames) before delivering.

## Video pipeline (10-20 s, 16:9)

- 16:9 start frame (no text in the frame; text is added later as stickers). H3 max is 15 s per generation; use 10 s segments and chain: `tools.sh lastframe seg1.mp4 last.png` -> `creations_request_upload` (image/png) -> `curl -X PUT --data-binary` -> `creations_finalize_upload` -> that identifier is the next `keyframes.start`.
- Prompt = exactly three fields in this order: `integrated_multimodal_description:` (environment, then each SUBJECT in caps with wardrobe, then 3-4 timed beats `00:00-00:03 -`), `overall_soundscape:` (diegetic only, say the ambience never drops to silence), `non_diegetic_music:` (say "no crescendo, no dramatic build, ends on a light held note" or H3 adds a trailer swell). One camera technique per beat ("camera locked off"), restate the subject block verbatim in every downstream segment, make the last beat "everything holds completely still" so the join is clean, and say "this look, the character designs and the colors stay identical from the first frame to the last".
- Join: `tools.sh join a.mp4 b.mp4 out.mp4`. Labels: GPT sticker sheet on pure white -> `key_stickers.py sheet.png outdir name1 name2 ...` -> `overlay_labels.sh raw.mp4 out.mp4 0.82 "outdir/name1.png:0.4:3.2" "outdir/name2.png:7.3:10.2" "outdir/name3.png:11:14:30:196"`. End card: `endcard.sh card.png 3 endcard.mp4` then `tools.sh join`.
- Review with a contact sheet and 3-4 extracted frames at label times; only then copy to `brand/video/` and document.

## Quirks

- Downloads from `pikaso.cdnpk.net` fail intermittently through the sandbox proxy: `scripts/dl.sh` retries with the CA bundle.
- `creations_wait` polls 25 s at a time; a 10 s H3 render takes ~6 min, queue several in one turn and poll them together (max 8 ids per call). Never regenerate a queued item.
- Single-frame ffmpeg outputs need `-frames:v 1 -update 1`; contact sheets need `-frames:v 1`.
- Playwright screenshots of pages that load YouTube or fonts through the proxy need `--ignore-certificate-errors`; YouTube embeds refuse to play from datacenter IPs anyway.
- GPT renders emoji unreliably; describe icons ("a small golden trophy icon") instead.
- Costs: ~100 credits per GPT image, ~920 per 10 s H3 video, ~3000 for a music generation (do not generate music unless asked; licensed music cannot go on the X stream).

## Photoreal projects without generating the likeness (Pitbull)

When the owner supplies one hero image and wants it used as-is, build the banner, posts and end card as
HTML/CSS over that image (`brand/posters/*.html`, Anton + Inter, gold on near-black) and render them with
Chromium (`scripts/render_poster.mjs page.html out.png W H`). A typography-only hype video is an HTML
animation recorded with `scripts/record_video.mjs page.html out.mp4 seconds` (Chromium `recordVideo` ->
H.264; the first ~0.9 s are blank Chromium frames and are trimmed). Neither needs Magnific credits, and the
creature is pixel-identical. The system `ffmpeg` (apt) is needed for JPEG/H.264; Playwright's bundled
`ffmpeg-linux` only knows webm/vp8.

## Recording HTML animations (the trap that costs an hour)

Chromium's recorded frame is **~86px shorter than the viewport** in this sandbox; the missing strip comes
back as a grey bar at the bottom of the video, and a square viewport is padded the same way (720²–1200²
all fail). Ask for `height + 86` and crop the frame back:

- 16:9 video: `scripts/record_video.mjs page.html out.mp4 seconds [audio.mp4] [w] [h]` — viewport `w × (h+86)`, crops `w:h:0:0`.
- Square loop: `scripts/record_gif.mjs page.html outbase seconds [square=1080] [out=480] [fps=12]` — writes both `.gif` and `.mp4` (upload the mp4 on X, it is a third of the size).

Two more rules for loops: give every animation a duration that divides the loop length (4s loop → 1s, 2s
or 4s animations, and `dMin: 4, dMax: 4` on falling money) or the GIF visibly jumps at the seam, and never
put the cashtag on a `blink` — half the frames would be missing it.

Write page JS through Python or a quoted heredoc. An unquoted bash heredoc eats `'` and `${...}`, which
silently produced pages with no rain, frozen clocks and empty charts.
