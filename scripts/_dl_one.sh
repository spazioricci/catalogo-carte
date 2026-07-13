#!/bin/bash
name="$1"; id="$2"; dest="data/_images_src/$name"
# idempotente: salta se gia' presente e >2KB e JPEG valido
if [ -s "$dest" ] && [ "$(stat -c%s "$dest")" -gt 2048 ]; then exit 0; fi
for attempt in 1 2 3; do
  curl -sL --max-time 60 "https://drive.google.com/uc?export=download&id=$id" -A "Mozilla/5.0" -o "$dest.part"
  sz=$(stat -c%s "$dest.part" 2>/dev/null || echo 0)
  if [ "$sz" -gt 2048 ] && head -c2 "$dest.part" | grep -q $'\xff\xd8'; then
    mv "$dest.part" "$dest"; exit 0
  fi
  sleep 1
done
rm -f "$dest.part"; echo "FAIL $name $id" >> data/_dl_fail.log; exit 1
