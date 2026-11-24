---
name: check-post
description: Score a draft social post for slop with SlopCheck before it is posted or scheduled. Use when the user asks whether a post reads as slop, as AI-sounding or as engagement bait, asks for a slop score, or is about to publish or schedule a post on X (Twitter) and wants it checked first. Free, no API key.
---

# Check a post for slop

SlopCheck gives a post a score from 0 to 100 for how much it reads like the posts people call out as slop: engagement bait, filler, formula.
50 or more reads as slop. It was built and tested on X posts.

It is not an AI detector. The score says how a post reads, not who or what wrote it, so never present it as evidence that a text was written by AI.

## Score one post

Send the post's text as JSON. With `python3` (present on most machines; it also takes care of quotes and line breaks in the post):

```bash
python3 - "$POST_TEXT" <<'PY'
import json, sys, urllib.request
req = urllib.request.Request("https://slopcheck.io/api/v1/check", data=json.dumps({"text": sys.argv[1]}).encode(), headers={"Content-Type": "application/json", "User-Agent": "slopcheck-skill"})
try:
    print(urllib.request.urlopen(req, timeout=30).read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode())
PY
```

The answer looks like this:

```json
{"verdict": "slop", "score": 0.79, "confidence": "medium", "modelVersion": "v3-style-1"}
```

`score` times 100, rounded, is the score to show. `verdict` is `slop` from 0.5 up and `not_slop` below.

## What to tell the user

- Give the score as "79/100" and the verdict in plain words: "reads as slop" or "doesn't read as slop".
- From 50 to 64, call it borderline.
- Do not say or imply that an AI wrote the post.
- If it reads as slop and the user wants help, revise the draft, score the new version and show both scores. Stop after three rounds. If the
  score does not come down, say so instead of rewriting again.
- Never change what the post claims in order to lower its score, and never add mistakes or odd spelling to it.

## Several drafts

Score each draft with its own call and list them from the lowest score to the highest.

## Limits

- Without a key: 50 calls a day per IP address. Status 429 means the day's allowance is used up: say so and stop, do not retry in a loop.
- A post can have up to 25,000 characters.
- The text is sent to slopcheck.io to be scored. SlopCheck's privacy page says it is processed for the score and not stored.
- How it compares with an AI detector on the same posts, losses included: https://slopcheck.io/vs/pangram
