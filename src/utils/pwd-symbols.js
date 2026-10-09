// @ts-check

/**
 * antity normalizer for `pwd_policy.symbols`: drops duplicate characters,
 * keeping first-seen order. Non-strings are returned untouched so the type
 * check still rejects them.
 * @param {unknown} v
 * @returns {unknown}
 */
export function dedupeSymbols(v) {
  return typeof v === "string" ? [...new Set(v)].join("") : v;
}
