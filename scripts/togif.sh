#!/bin/bash
# usage: togif.sh input.mp4 outbase   -> outbase.gif (512px, 15 fps, loop) + outbase.mp4 (copy)
FF=$(python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
in=$1; out=$2
$FF -y -loglevel error -i "$in" -vf "fps=15,scale=512:512:flags=lanczos,palettegen=max_colors=256:stats_mode=full" "$out-palette.png"
$FF -y -loglevel error -i "$in" -i "$out-palette.png" -lavfi "fps=15,scale=512:512:flags=lanczos[x];[x][1:v]paletteuse=dither=none" -loop 0 "$out.gif"
rm -f "$out-palette.png"
cp "$in" "$out.mp4"
ls -la "$out.gif" | awk '{print $5, $9}'
