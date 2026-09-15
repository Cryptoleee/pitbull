#!/bin/bash
# lastframe in.mp4 out.png  |  join a.mp4 b.mp4 out.mp4  |  sheet in.mp4 out.png
FF=$(command -v ffmpeg || python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
case "$1" in
  lastframe) $FF -y -loglevel error -sseof -0.05 -i "$2" -frames:v 1 -update 1 "$3" ;;
  join) printf "file '%s'\nfile '%s'\n" "$(realpath $2)" "$(realpath $3)" > /tmp/concat.txt
        $FF -y -loglevel error -f concat -safe 0 -i /tmp/concat.txt -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$4" ;;
  sheet) $FF -y -loglevel error -i "$2" -vf "fps=1,scale=320:-1,tile=5x2" -frames:v 1 "$3" ;;
  info) $FF -i "$2" 2>&1 | grep -E "Duration|Stream" | sed 's/^ *//' ;;
esac
