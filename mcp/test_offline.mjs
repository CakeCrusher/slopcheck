// Drives index.js over stdio against a stand-in for slopcheck.io on this machine (no outside call): the tools, a batch in which one
// draft is empty and one check fails, and the error paths. Usage: node test_offline.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const text = JSON.parse(body).text;
    if (/make this one fail/.test(text)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "You've used today's free checks." }));
    }
    const score = /unlock|game-changing/i.test(text) ? 0.81 : 0.17;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ score, verdict: score >= 0.5 ? "slop" : "not_slop", confidence: "high" }));
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const p = spawn("node", [new URL("./index.js", import.meta.url).pathname], { stdio: ["pipe", "pipe", "inherit"], env: { ...process.env, SLOPCHECK_URL: base, SLOPCHECK_API_KEY: "" } });
let buf = "";
const waiters = new Map();
p.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    waiters.get(m.id)?.(m);
  }
});
let n = 0;
const rpc = (method, params) => new Promise((res) => { const id = ++n; waiters.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
const timer = setTimeout(() => { console.error("timed out"); p.kill(); server.close(); process.exit(1); }, 30000);

const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } });
assert.equal(init.result.serverInfo.name, "slopcheck");
const tools = await rpc("tools/list", {});
assert.deepEqual(tools.result.tools.map((t) => t.name), ["check_post", "check_posts"], "no key: no feedback tool");
const one = await rpc("tools/call", { name: "check_post", arguments: { text: "Unlock your potential with these game-changing hacks" } });
assert.equal(one.result.isError, false);
assert.match(one.result.content[0].text, /^81\/100, reads as slop/);
assert.deepEqual(one.result.structuredContent, { score: 81, verdict: "slop", confidence: "high" });
const many = await rpc("tools/call", { name: "check_posts", arguments: { texts: ["walked to the bakery and they were out of bread", "   ", "please make this one fail on the server side", "Unlock game-changing growth today"] } });
const lines = many.result.content[0].text.split("\n");
assert.equal(lines.length, 4, "every draft keeps its place");
assert.match(lines[0], /^1\. 17\/100/);
assert.match(lines[1], /^2\. not scored \(empty\)/);
assert.match(lines[2], /^3\. not scored \(You've used today's free checks\.\)/);
assert.match(lines[3], /^4\. 81\/100/);
assert.deepEqual(many.result.structuredContent.results.map((r) => r.score ?? r.error), [17, "empty", "You've used today's free checks.", 81]);
const none = await rpc("tools/call", { name: "check_posts", arguments: { texts: ["", "  "] } });
assert.equal(none.result.isError, true);
const bad = await rpc("tools/call", { name: "check_post", arguments: {} });
assert.equal(bad.result.isError, true);
const unk = await rpc("nope/method", {});
assert.equal(unk.error.code, -32601);
clearTimeout(timer);
p.kill();
server.close();
console.log("mcp offline tests pass");
