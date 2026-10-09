/**
 * @jest-environment node
 */

import { dedupeSymbols } from "../../src/utils/pwd-symbols.js";

describe("dedupeSymbols", () => {
  it("removes duplicate characters", () => {
    expect(dedupeSymbols("!!@@!")).toBe("!@");
  });

  it("keeps first-seen order", () => {
    expect(dedupeSymbols("@!@#!")).toBe("@!#");
  });

  it("leaves a list without duplicates unchanged", () => {
    expect(dedupeSymbols("!@#%*_-+=:?><./()")).toBe("!@#%*_-+=:?><./()");
  });

  it("returns an empty string unchanged", () => {
    expect(dedupeSymbols("")).toBe("");
  });

  it("returns non-strings unchanged", () => {
    expect(dedupeSymbols(42)).toBe(42);
    expect(dedupeSymbols(null)).toBeNull();
  });
});
