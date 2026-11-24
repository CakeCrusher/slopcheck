"""Scores posts with SlopCheck's free API: no key, 50 calls a day per address. Standard library only.
Usage: python3 check.py "first post" "second post" ..."""
import json, sys, urllib.error, urllib.request


def slop_score(text):
    """Returns (score from 0 to 100, verdict, confidence), or raises RuntimeError with the API's message."""
    req = urllib.request.Request("https://slopcheck.io/api/v1/check", data=json.dumps({"text": text}).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": "slopcheck-example"})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:   # 429: today's free calls from this address are used up
        raise RuntimeError(f"{e.code}: {json.loads(e.read() or b'{}').get('error', 'refused')}")
    return round(r["score"] * 100), r["verdict"], r["confidence"]


if __name__ == "__main__":
    for post in sys.argv[1:]:
        score, verdict, confidence = slop_score(post)
        print(f"{score:>3}/100  {'slop' if verdict == 'slop' else 'ok  '}  {confidence:<6}  {post[:70]!r}")
