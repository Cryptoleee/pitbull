#!/bin/bash
# overlay_labels.sh IN.mp4 OUT.mp4 SCALE "label.png:start:end[:x:y]" ...
# Overlays sticker labels (from key_stickers.py) on a video for the given second windows, with a
# 0.25 s alpha fade in/out. SCALE is relative to the label's own size (0.8 puts a ~650 px sticker at
# ~520 px on a 1344 px frame). Default position is the top-left corner (30,24); pass x:y to stack.
set -euo pipefail
FF=$(python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
IN=$1; OUT=$2; SC=$3; shift 3
INPUTS=(-i "$IN"); FC=""; PREV="0:v"; i=1
for spec in "$@"; do
  IFS=: read -r png a b x y <<< "$spec"; x=${x:-30}; y=${y:-24}
  INPUTS+=(-loop 1 -t 3600 -i "$png")
  FC="$FC[$i:v]scale=iw*$SC:-1,format=rgba,fade=t=in:st=$a:d=0.25:alpha=1,fade=t=out:st=$(python3 -c "print($b-0.25)"):d=0.25:alpha=1[l$i];"
  FC="$FC[$PREV][l$i]overlay=$x:$y:enable='between(t,$a,$b)'[v$i];"
  PREV="v$i"; i=$((i+1))
done
$FF -y -loglevel error "${INPUTS[@]}" -filter_complex "${FC%;}" -map "[$PREV]" -map 0:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a copy -shortest "$OUT"
$FF -i "$OUT" 2>&1 | grep Duration | sed 's/^ *//'
