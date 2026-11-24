// Scores posts with SlopCheck's free API: no key, 50 calls a day per address. Node 18 or later.
// Usage: node check.mjs "first post" "second post" ...
export async function slopScore(text) {
  const res = await fetch("https://slopcheck.io/api/v1/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${body.error ?? "refused"}`);   // 429: today's free calls from this address are used up
  return { score: Math.round(body.score * 100), verdict: body.verdict, confidence: body.confidence };
}

for (const post of process.argv.slice(2)) {
  const r = await slopScore(post);
  console.log(`${String(r.score).padStart(3)}/100  ${r.verdict === "slop" ? "slop" : "ok  "}  ${r.confidence.padEnd(6)}  ${JSON.stringify(post.slice(0, 70))}`);
}
