#!/bin/bash
SESSIONS=("8117929261044184129" "7711229285923208038" "3624123056884487934")
while true; do
  echo "--- Polling Wave 1 Status: $(date) ---" >> .jules-status.log
  for sid in "${SESSIONS[@]}"; do
    jules remote list --session "$sid" >> .jules-status.log 2>&1
  done
  echo "" >> .jules-status.log
  sleep 900
done
