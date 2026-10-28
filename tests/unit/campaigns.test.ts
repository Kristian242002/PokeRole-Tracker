import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, generateJoinCode, normalizeJoinCode } from "@/lib/campaigns";

describe("codici campagna", () => {
  it("6 caratteri senza 0, O, 1, I", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
    expect(JOIN_CODE_ALPHABET).toHaveLength(32);
  });

  it("RNG iniettabile", () => {
    expect(generateJoinCode(() => 0)).toBe("AAAAAA");
    expect(generateJoinCode(() => 0.9999)).toBe("999999");
  });

  it("normalizza quello che scrive il giocatore", () => {
    expect(normalizeJoinCode(" ab2-cd3 ")).toBe("AB2CD3");
    expect(normalizeJoinCode("AB2CD")).toBeNull();
    expect(normalizeJoinCode("AB2CD0")).toBeNull();
    expect(normalizeJoinCode("ABCDEFG")).toBeNull();
  });
});
