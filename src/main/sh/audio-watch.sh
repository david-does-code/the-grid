#!/usr/bin/env bash
# The Grid: prints "id|name" for PulseAudio/PipeWire's default sink at start and on every switch.
current() {
  local id desc
  id=$(pactl get-default-sink 2>/dev/null) || { echo '|'; return; }
  desc=$(LC_ALL=C pactl list sinks 2>/dev/null | awk -v id="$id" '$1 == "Name:" { hit = ($2 == id) } hit && $1 == "Description:" { sub(/^[ \t]*Description: /, ""); print; exit }')
  echo "$id|${desc:-$id}"
}
current
LC_ALL=C pactl subscribe | while read -r line; do
  case "$line" in *"on server"*) current ;; esac
done
