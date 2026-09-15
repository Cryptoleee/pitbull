#!/bin/bash
# dl.sh URL OUTFILE - download a Magnific render (pikaso.cdnpk.net). The sandbox proxy cuts long
# transfers now and then and needs its CA bundle, so retry a few times before giving up.
CA=${CURL_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}
for i in 1 2 3 4; do
  curl -s --retry 3 --max-time 180 $([ -f "$CA" ] && echo --cacert "$CA") -o "$2" "$1" && [ -s "$2" ] && exit 0
  sleep 3
done
echo "download failed: $2" >&2; exit 1
