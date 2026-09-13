import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTokens, estimateAll, reduction } from "../src/lib/tokens.mjs";

test("an estimate is deterministic", () => {
  const text = "SEC-001 · MUST · P0 — Server-side authorization on every sensitive operation";
  assert.equal(estimateTokens(text), estimateTokens(text));
});

test("cost grows with the text and is never zero for non-empty input", () => {
  assert.equal(estimateTokens(""), 0);
  assert.ok(estimateTokens("a") >= 1);
  assert.ok(estimateTokens("one two three") > estimateTokens("one two"));
});

// The estimate exists to decide what fits in a budget, so it has to stay in the same
// neighbourhood as the ratios published for English. Claiming precision it does not have is the
// failure mode here, not being a few percent off.
test("prose lands near the accepted characters-per-token ratio", () => {
  const prose =
    "An agent that starts cold re-derives the project on every task: it invents APIs, " +
    "re-litigates decisions that were already made, and reports done because the unit tests " +
    "passed. Documentation does not fix that.";
  const naive = prose.length / 4;
  const estimate = estimateTokens(prose);
  const drift = Math.abs(estimate - naive) / naive;
  assert.ok(drift < 0.25, `estimate ${estimate} drifts ${Math.round(drift * 100)}% from ${naive}`);
});

test("markdown structure costs more per character than prose", () => {
  const row = "| SEC-001 | Server-side authorization | MUST | P0 | security | yes | active |";
  const prose = "Server side authorization applies to every sensitive operation here now";
  assert.ok(
    estimateTokens(row) / row.length > estimateTokens(prose) / prose.length,
    "a table row is denser in punctuation and must not be costed as prose"
  );
});

test("a newline costs a token, so structure is not free", () => {
  assert.equal(estimateTokens("a\nb") - estimateTokens("a b"), 1);
});

test("estimateAll sums the parts", () => {
  const parts = ["alpha beta", "gamma", "| delta |"];
  assert.equal(estimateAll(parts), parts.reduce((n, p) => n + estimateTokens(p), 0));
});

test("reduction never invents an improvement out of nothing", () => {
  assert.equal(reduction(0, 0), 0);
  assert.equal(reduction(-5, 1), 0);
  assert.equal(reduction(1000, 250), 75);
  assert.equal(reduction(1000, 1000), 0);
});
