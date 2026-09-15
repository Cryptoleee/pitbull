# Plantoshi streamer: renders the stream overlay page in a virtual display and pushes it to an RTMP
# ingest (X Media Studio Producer, or any RTMP server) with the page's audio (the trade sound effects).
FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium xvfb x11-utils pulseaudio pulseaudio-utils ffmpeg ca-certificates procps \
      fonts-noto-core fonts-noto-color-emoji fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 streamer && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER streamer
ENV HOME=/home/streamer \
    WIDTH=1920 HEIGHT=1080 FPS=30 VIDEO_BITRATE=4500k AUDIO_BITRATE=160k \
    PAGE_URL="https://plantoshi.fun/?stream=1"
ENTRYPOINT ["/entrypoint.sh"]
