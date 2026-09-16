#!/bin/bash
# usage: togif.sh input.mp4 outbase [size=512] [fps=15] [colors=256]
# Writes outbase.gif (looping) and copies the source next to it as outbase.mp4.
# A photoreal clip needs a smaller size / fewer colours than flat art: 384px, 12fps, 128 colours keeps a
# 5s loop near 2 MB, where the defaults produce 8-10 MB.
FF=$(command -v ffmpeg || python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
in=$1; out=$2; size=${3:-512}; fps=${4:-15}; colors=${5:-256}
chain="fps=$fps,scale=$size:$size:flags=lanczos"
$FF -y -loglevel error -i "$in" -vf "$chain,palettegen=max_colors=$colors:stats_mode=diff" "$out-palette.png"
$FF -y -loglevel error -i "$in" -i "$out-palette.png" -lavfi "$chain[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "$out.gif"
rm -f "$out-palette.png"
cp "$in" "$out.mp4"
ls -la "$out.gif" | awk '{print $5, $9}'
