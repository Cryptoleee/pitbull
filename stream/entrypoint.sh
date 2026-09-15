#!/bin/bash
# Xvfb (virtual screen) + PulseAudio (null sink) + Chromium kiosk + ffmpeg x11grab/pulse -> RTMP. Add music in OBS if you want any.
#
#   RTMP_URL      rtmp(s)://… ingest URL from X Media Studio → Producer (or any RTMP server)
#   STREAM_KEY    the stream key that goes with it (appended to RTMP_URL)
#   PAGE_URL      page to capture (default https://plantoshi.fun/?stream=1)
#   WIDTH/HEIGHT/FPS/VIDEO_BITRATE/AUDIO_BITRATE   1920/1080/30/4500k/160k by default
#   OUTPUT        write to a file instead of RTMP (testing), DURATION seconds to stop after
#   CHROME_BIN    chromium binary (default: chromium), CHROME_FLAGS extra flags
set -euo pipefail

WIDTH=${WIDTH:-1920}
HEIGHT=${HEIGHT:-1080}
FPS=${FPS:-30}
VIDEO_BITRATE=${VIDEO_BITRATE:-4500k}
AUDIO_BITRATE=${AUDIO_BITRATE:-160k}
PAGE_URL=${PAGE_URL:-"https://plantoshi.fun/?stream=1"}
CHROME_BIN=${CHROME_BIN:-chromium}
WARMUP_SECONDS=${WARMUP_SECONDS:-10}
OUTPUT=${OUTPUT:-}
SHOWN_OUTPUT=$OUTPUT
# tolerate keys/urls pasted with placeholder brackets, quotes or whitespace around them
strip() { local v=$1; v=${v//[[:space:]]/}; v=${v#\"}; v=${v%\"}; v=${v#\'}; v=${v%\'}; v=${v#<}; v=${v%>}; printf '%s' "$v"; }
STREAM_KEY=$(strip "${STREAM_KEY:-}")
RTMP_URL=$(strip "${RTMP_URL:-}")
if [ -z "$OUTPUT" ]; then
  if [ -z "${RTMP_URL:-}" ] || [ -z "${STREAM_KEY:-}" ]; then
    echo "[stream] ERROR: set RTMP_URL (e.g. rtmp://va.pscp.tv:80/x) and STREAM_KEY from X Media Studio → Producer, or OUTPUT=/path/file.flv for a test" >&2
    exit 1
  fi
  OUTPUT="${RTMP_URL%/}/${STREAM_KEY}"
  SHOWN_OUTPUT="${RTMP_URL%/}/${STREAM_KEY:0:3}…"
fi
VB=${VIDEO_BITRATE%k}
BUFSIZE=$((VB * 2))k

export DISPLAY=:${DISPLAY_NUM:-99}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/tmp/plantoshi-xdg}
LOG_DIR=${LOG_DIR:-/tmp/plantoshi-logs}
mkdir -p "$XDG_RUNTIME_DIR" "$LOG_DIR"
export PULSE_SERVER="unix:$XDG_RUNTIME_DIR/pulse-socket"

cleanup() {
  echo "[stream] shutting down"
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[stream] ${WIDTH}x${HEIGHT}@${FPS} ${VIDEO_BITRATE} video, ${AUDIO_BITRATE} audio -> $SHOWN_OUTPUT"
echo "[stream] page: $PAGE_URL (user $(id -un), chromium: $("$CHROME_BIN" --version 2>/dev/null || echo 'not found'), $(ffmpeg -version 2>/dev/null | head -n 1))"

mkdir -p /tmp/.X11-unix 2>/dev/null || true
Xvfb "$DISPLAY" -screen 0 "${WIDTH}x${HEIGHT}x24" -nolisten tcp -ac +extension RANDR >"$LOG_DIR"/xvfb.log 2>&1 &
XVFB_PID=$!
X_OK=0
for _ in $(seq 1 50); do
  if command -v xdpyinfo >/dev/null 2>&1; then xdpyinfo -display "$DISPLAY" >/dev/null 2>&1 && X_OK=1 && break; else [ -S "/tmp/.X11-unix/X${DISPLAY#:}" ] && X_OK=1 && break; fi
  sleep 0.2
done
if [ "$X_OK" != 1 ] || ! kill -0 "$XVFB_PID" 2>/dev/null; then
  echo "[stream] ERROR: Xvfb did not start:" >&2; cat "$LOG_DIR"/xvfb.log >&2; exit 1
fi
echo "[stream] display $DISPLAY up"

pulseaudio -n --daemonize=no --exit-idle-time=-1 --disallow-exit --disable-shm=yes --realtime=no --high-priority=no \
  -L "module-native-protocol-unix socket=$XDG_RUNTIME_DIR/pulse-socket auth-anonymous=1" \
  -L "module-null-sink sink_name=stream sink_properties=device.description=stream" \
  -L "module-always-sink" >"$LOG_DIR"/pulse.log 2>&1 &
P_OK=0
for _ in $(seq 1 50); do pactl info >/dev/null 2>&1 && P_OK=1 && break; sleep 0.2; done
if [ "$P_OK" != 1 ]; then
  echo "[stream] ERROR: PulseAudio did not start:" >&2; cat "$LOG_DIR"/pulse.log >&2; exit 1
fi
pactl set-default-sink stream >/dev/null 2>&1 || true
echo "[stream] audio sink: $(pactl get-default-sink 2>/dev/null || echo '?')"

"$CHROME_BIN" --no-sandbox --disable-dev-shm-usage --disable-gpu --kiosk --no-first-run --no-default-browser-check \
  --disable-infobars --disable-session-crashed-bubble --hide-scrollbars --force-device-scale-factor=1 \
  --window-position=0,0 --window-size="${WIDTH},${HEIGHT}" --autoplay-policy=no-user-gesture-required \
  --disable-features=TranslateUI --user-data-dir="$XDG_RUNTIME_DIR"/chrome --lang=en-US --disable-background-timer-throttling \
  --disable-renderer-backgrounding --enable-features=OverlayScrollbar ${CHROME_FLAGS:-} "$PAGE_URL" >"$LOG_DIR"/chrome.log 2>&1 &
CHROME_PID=$!
sleep "$WARMUP_SECONDS"
if ! kill -0 "$CHROME_PID" 2>/dev/null; then
  echo "[stream] ERROR: Chromium exited during warm-up:" >&2; tail -n 40 "$LOG_DIR"/chrome.log >&2; exit 1
fi
echo "[stream] chromium up, starting ffmpeg"

while true; do
  # shellcheck disable=SC2086
  ffmpeg -hide_banner -loglevel warning -stats -stats_period 60 \
    -thread_queue_size 1024 -f x11grab -framerate "$FPS" -video_size "${WIDTH}x${HEIGHT}" -draw_mouse 0 -i "$DISPLAY" \
    -thread_queue_size 1024 -f pulse -i stream.monitor \
    ${DURATION:+-t $DURATION} \
    -c:v libx264 -preset veryfast -tune zerolatency -profile:v high -pix_fmt yuv420p -r "$FPS" \
    -g $((FPS * 2)) -keyint_min $((FPS * 2)) -sc_threshold 0 -b:v "$VIDEO_BITRATE" -maxrate "$VIDEO_BITRATE" -bufsize "$BUFSIZE" \
    -c:a aac -b:a "$AUDIO_BITRATE" -ar 44100 -ac 2 -af aresample=async=1 \
    -flvflags no_duration_filesize -f flv "$OUTPUT" && FF=0 || FF=$?
  if [ -n "${DURATION:-}" ]; then echo "[stream] test recording finished (ffmpeg exit $FF)"; break; fi
  echo "[stream] ffmpeg exited with code $FF, reconnecting in 5s"
  if ! kill -0 "$CHROME_PID" 2>/dev/null; then echo "[stream] chromium is gone:" >&2; tail -n 20 "$LOG_DIR"/chrome.log >&2; exit 1; fi
  sleep 5
done
