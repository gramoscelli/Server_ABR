#!/bin/sh
set -e

# Sync system clock with an external NTP server at startup
echo "Syncing clock with NTP server..."
if ntpdate -u pool.ntp.org 2>/dev/null; then
  echo "Clock synced with pool.ntp.org"
elif ntpdate -u time.google.com 2>/dev/null; then
  echo "Clock synced with time.google.com"
else
  echo "Warning: NTP sync failed (non-critical)"
fi

exec "$@"
