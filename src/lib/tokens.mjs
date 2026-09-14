/**
 * Token estimation, without a tokenizer.
 *
 * `ARC-004` rules out shipping a BPE vocabulary, and a context budget still has to be counted
 * against something. So this is an *estimate* — deterministic, stable across runs, and reported
 * as an estimate everywhere it surfaces. It is never presented as an exact token count, because
 * a number that looks exact and is not teaches people to trust it.
 *
 * The model: a word costs roughly one token per 4.5 characters, a punctuation run about one per
 * two characters, and a line break one. Measured against the ratios published for English prose
 * and for Markdown with tables and fenced code, it lands within roughly ±20%. That is accurate
 * enough to decide what fits in a budget and to report a reduction, and not accurate enough to
 * quote as a bill.
 */

const WORD = /[A-Za-z0-9_'’-]+/y;
const PUNCT = /[^A-Za-z0-9_'’\-\s]+/y;

/** Estimated tokens for a string. Deterministic: the same text always costs the same. */
export function estimateTokens(text) {
  const s = String(text ?? "");
  let i = 0;
  let total = 0;

  while (i < s.length) {
    const c = s[i];

    if (c === "\n") {
      total += 1;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }

    WORD.lastIndex = i;
    const word = WORD.exec(s);
    if (word) {
      total += Math.max(1, Math.round(word[0].length / 4.5));
      i = WORD.lastIndex;
      continue;
    }

    PUNCT.lastIndex = i;
    const punct = PUNCT.exec(s);
    if (punct) {
      total += Math.ceil(punct[0].length / 2);
      i = PUNCT.lastIndex;
      continue;
    }

    // A character neither pattern claimed (an emoji, a CJK glyph): one token, never zero.
    total += 1;
    i++;
  }

  return total;
}

/** Estimated tokens for several strings at once. */
export function estimateAll(parts) {
  return parts.reduce((n, p) => n + estimateTokens(p), 0);
}

/**
 * `before -> after` as a percentage saved, rounded to one decimal. Returns 0 when there was
 * nothing to save, rather than a division by zero dressed as an improvement.
 */
export function reduction(before, after) {
  if (!before || before <= 0) return 0;
  const pct = ((before - after) / before) * 100;
  return Math.round(pct * 10) / 10;
}
