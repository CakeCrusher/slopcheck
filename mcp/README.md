# slopcheck-mcp

An MCP server that lets an AI agent check an X post for slop before it posts.

SlopCheck scores a post from 0 to 100. 50 or more reads as slop: readers are likely to skip it as low-value or AI-sounding.
Scores are free and need no API key.

## Use it

Claude Code:

```
claude mcp add slopcheck -- npx -y github:CakeCrusher/slopcheck
```

Cursor, Claude Desktop and other clients, in the MCP config:

```json
{ "mcpServers": { "slopcheck": { "command": "npx", "args": ["-y", "github:CakeCrusher/slopcheck"] } } }
```

## Tools

| Tool | What it does |
|---|---|
| `check_post` | Scores one draft post. Returns the score, the verdict and how confident it is. |
| `check_posts` | Scores up to 20 drafts in one call, in order. Use it to pick the best draft. |
| `get_feedback` | Premium only. Scores the post and says what reads as slop and what to change. |

`get_feedback` appears when `SLOPCHECK_API_KEY` is set to a SlopCheck Premium key (slopcheck.io/developers).

## Limits

Without a key the server uses SlopCheck's free API: 50 checks a day per IP address. Post text is sent to slopcheck.io to be scored and is not stored.

## Test

`node test_offline.mjs` runs the server against a stand-in on this machine (tools, a batch with an empty draft and a failed check, error paths).
`node test_client.mjs` starts the server, lists its tools and runs a few checks against slopcheck.io.
