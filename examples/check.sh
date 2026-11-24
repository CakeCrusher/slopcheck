#!/bin/sh
# Scores one post with SlopCheck's free API (no key, 50 calls a day per address). Usage: ./check.sh "the post"
python3 - "$1" <<'PY'
import json, sys, urllib.request
req = urllib.request.Request("https://slopcheck.io/api/v1/check", data=json.dumps({"text": sys.argv[1]}).encode(), headers={"Content-Type": "application/json", "User-Agent": "slopcheck-example"})
r = json.loads(urllib.request.urlopen(req, timeout=30).read())
print(f"{round(r['score'] * 100)}/100", "reads as slop" if r["verdict"] == "slop" else "doesn't read as slop", f"({r['confidence']} confidence)")
PY
