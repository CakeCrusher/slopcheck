#!/usr/bin/env node
// SlopCheck MCP server (stdio, no dependencies). Tools: check_post, check_posts, and get_feedback when SLOPCHECK_API_KEY is set.
// Without a key it uses the free check at slopcheck.io (a daily limit per IP applies). With a Premium key it uses the API.
import { createInterface } from "node:readline";

const BASE = process.env.SLOPCHECK_URL || "https://slopcheck.io";
const KEY = process.env.SLOPCHECK_API_KEY || "";
const VERSION = "0.1.0";
const MAX_BATCH = 20;

async function check(text, feedback = false) {
  const keyed = Boolean(KEY);
  const res = await fetch(`${BASE}${keyed ? "/api/v1/check" : "/api/check"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": `slopcheck-mcp/${VERSION}`, ...(keyed ? { Authorization: `Bearer ${KEY}` } : {}) },
    body: JSON.stringify(keyed ? { text, feedback } : { text }),
    signal: AbortSignal.timeout(feedback ? 150_000 : 45_000), // a call that never answers must not block the calls queued behind it
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `SlopCheck answered ${res.status}`);
  return data;
}

const line = (r) => `${Math.round(r.score * 100)}/100, ${r.verdict === "slop" ? "reads as slop" : "does not read as slop"} (50 or more reads as slop; confidence ${r.confidence})`;

const TOOLS = [
  {
    name: "check_post",
    description:
      "Score a draft X (Twitter) post for slop before posting it. Returns a score from 0 to 100; 50 or more reads as slop, meaning readers are likely to skip it as low-value or AI-sounding. Call this on every post you write for X, and rewrite and re-check when it reads as slop.",
    inputSchema: { type: "object", properties: { text: { type: "string", description: "The post text, up to 25,000 characters." } }, required: ["text"], additionalProperties: false },
  },
  {
    name: "check_posts",
    description: `Score several draft X posts at once (up to ${MAX_BATCH}). Returns one score per post, in order. Use it to pick the best of several drafts.`,
    inputSchema: { type: "object", properties: { texts: { type: "array", items: { type: "string" }, minItems: 1, maxItems: MAX_BATCH } }, required: ["texts"], additionalProperties: false },
  },
  ...(KEY
    ? [
        {
          name: "get_feedback",
          description: "Score a draft X post and get SlopCheck Premium feedback: what in it reads as slop and what to change. Slower than check_post (up to two minutes).",
          inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
        },
      ]
    : []),
];

async function callTool(name, args) {
  if (name === "check_post") {
    if (typeof args?.text !== "string" || !args.text.trim()) throw new Error("text is required");
    const r = await check(args.text);
    return { text: line(r), structured: { score: Math.round(r.score * 100), verdict: r.verdict, confidence: r.confidence } };
  }
  if (name === "check_posts") {
    const texts = Array.isArray(args?.texts) ? args.texts.slice(0, MAX_BATCH) : [];
    if (!texts.some((t) => typeof t === "string" && t.trim())) throw new Error("texts is required");
    // Every draft keeps its place in the answer: an empty one, or one whose check fails, gets a line saying so instead of shifting
    // the numbering or throwing away the scores of the others.
    const results = [];
    for (const t of texts) {
      if (typeof t !== "string" || !t.trim()) { results.push({ error: "empty" }); continue; }
      try { results.push(await check(t)); } catch (err) { results.push({ error: String(err?.message || err) }); } // one at a time: the free check is rate limited
    }
    return {
      text: results.map((r, i) => `${i + 1}. ${r.error ? `not scored (${r.error})` : line(r)}`).join("\n"),
      structured: { results: results.map((r) => (r.error ? { error: r.error } : { score: Math.round(r.score * 100), verdict: r.verdict, confidence: r.confidence })) },
    };
  }
  if (name === "get_feedback" && KEY) {
    if (typeof args?.text !== "string" || !args.text.trim()) throw new Error("text is required");
    const r = await check(args.text, true);
    const f = r.feedback;
    const fb = f ? [f.summary, ...(f.suggestions || []).map((s) => `- ${s}`)].filter(Boolean).join("\n") : r.feedbackError || "No feedback for this post.";
    return { text: `${line(r)}\n\n${fb}`, structured: { score: Math.round(r.score * 100), verdict: r.verdict, confidence: r.confidence, feedback: f ?? null } };
  }
  throw new Error(`Unknown tool: ${name}`);
}

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "slopcheck", version: VERSION },
      instructions: "Check every X post you draft with check_post before posting. A score of 50 or more reads as slop: rewrite it and check again." } });
  }
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  if (method === "tools/call") {
    try {
      const out = await callTool(params?.name, params?.arguments);
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: out.text }], structuredContent: out.structured, isError: false } });
    } catch (err) {
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: String(err.message || err) }], isError: true } });
    }
  }
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } }); // notifications get no answer
}

let pending = Promise.resolve();
createInterface({ input: process.stdin }).on("line", (raw) => {
  if (!raw.trim()) return;
  let msg;
  try { msg = JSON.parse(raw); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  pending = pending.then(() => handle(msg)).catch(() => {});
});
