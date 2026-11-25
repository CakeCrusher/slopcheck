# SlopCheck for developers and agents

A free slop score for X posts: one HTTP call, no key.

SlopCheck scores a post from 0 to 100 for how much it reads like the posts people call out as slop: engagement bait, filler, formula.
50 or more reads as slop. The site is [slopcheck.io](https://slopcheck.io).

It is **not an AI detector**. It says how a post reads, not who or what wrote it. If you need to know whether an AI wrote a text, use an AI
detector such as Pangram.

## The API

```bash
curl -s https://slopcheck.io/api/v1/check \
  -H 'Content-Type: application/json' \
  -d '{"text": "Most people use AI wrong. Here are 7 prompts that will change how you work forever"}'
```

```json
{"verdict": "slop", "score": 0.79, "confidence": "medium", "modelVersion": "v3-style-1"}
```

`score` times 100 is the score the site shows. Without a key you get 50 calls a day per IP address; the answer's `X-RateLimit-*` headers say
what is left. The full reference is at [slopcheck.io/developers](https://slopcheck.io/developers). Ready-made calls are in [`examples/`](examples).

## For AI agents

**MCP server** ([`mcp/`](mcp)): lets an agent check a draft before it posts. In Claude Code:

```
claude mcp add slopcheck -- npx -y github:CakeCrusher/slopcheck
```

For clients that install bundles (Claude Desktop): download `slopcheck.mcpb` from the
[latest release](https://github.com/CakeCrusher/slopcheck/releases/latest) and open it.

**Agent skill** ([`plugins/slopcheck`](plugins/slopcheck)): the same check as a skill, with no server to run. In Claude Code:

```
/plugin marketplace add CakeCrusher/slopcheck
/plugin install slopcheck@slopcheck
```

Then ask "does this post read as slop?" or run `/slopcheck:check-post`.

## How good is it

We ran SlopCheck and Pangram, an AI detector, on the same 20,928 posts and published every result, the losses included:
[slopcheck.io/vs/pangram](https://slopcheck.io/vs/pangram).

| On X posts | Pangram | SlopCheck |
|---|---|---|
| Verdict right | 85% | 79% |
| Verdict right, posts under 30 words | 64% | 67% |
| Price for one post through the API | $0.05 | free |

"Verdict right" is the average of slop caught and good posts left alone. Pangram is the more accurate of the two, and at telling AI writing
from human writing it is far ahead, which is not what SlopCheck is for. Under 30 words the difference is inside the margin of error.

## What is in this repository, and what is not

This repository holds client code: the MCP server, the skill and the examples. It is under the MIT licence. The scoring model and the posts
it learned from are not part of it.

## Limits and privacy

- 50 calls a day per IP address without a key. Posts of up to 25,000 characters.
- A post's text is sent to slopcheck.io to be scored. It is processed for the score and not stored: [privacy](https://slopcheck.io/privacy).
- Built and tested on X posts. It was never tested on articles, essays or email.
