/**
 * @jest-environment node
 */
import {
  CHALLENGE_MINT_TTL_MS,
  clearChallengeMints,
  consumeChallengeMint,
  grantChallengeMint,
} from "../../src/services/challenge-grant.js";

describe("challenge mint grants", () => {
  beforeEach(() => {
    clearChallengeMints();
  });

  it("should consume a grant issued after compare", () => {
    grantChallengeMint(7);
    expect(consumeChallengeMint(7)).toBe(true);
    expect(consumeChallengeMint(7)).toBe(false);
  });

  it("should reject a missing or expired grant", () => {
    expect(consumeChallengeMint(3)).toBe(false);
    const now = 1_000_000;
    grantChallengeMint(3, now);
    expect(consumeChallengeMint(3, now + CHALLENGE_MINT_TTL_MS)).toBe(false);
  });

  it("should ignore invalid user ids", () => {
    grantChallengeMint(0);
    grantChallengeMint(-1);
    expect(consumeChallengeMint(0)).toBe(false);
    expect(consumeChallengeMint(-1)).toBe(false);
  });
});
