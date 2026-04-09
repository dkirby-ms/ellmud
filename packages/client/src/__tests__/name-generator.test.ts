import { describe, it, expect } from "vitest";
import { generateRandomName } from "../utils/name-generator";
import { validateCharacterName } from "@ellmud/shared";

describe("generateRandomName", () => {
  it("returns a non-empty string", () => {
    const name = generateRandomName();
    expect(name.length).toBeGreaterThanOrEqual(2);
  });

  it("passes shared character name validation", () => {
    // Run 50 times to exercise both curated and procedural paths
    for (let i = 0; i < 50; i++) {
      const name = generateRandomName();
      const result = validateCharacterName(name);
      expect(result.valid, `"${name}" failed validation: ${result.error}`).toBe(
        true,
      );
    }
  });

  it("starts with an uppercase letter", () => {
    for (let i = 0; i < 30; i++) {
      const name = generateRandomName();
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });

  it("has lowercase letters after the first character", () => {
    for (let i = 0; i < 30; i++) {
      const name = generateRandomName();
      if (name.length > 1) {
        expect(name.slice(1)).toBe(name.slice(1).toLowerCase());
      }
    }
  });

  it("contains only alphabetic characters", () => {
    for (let i = 0; i < 30; i++) {
      const name = generateRandomName();
      expect(name).toMatch(/^[A-Za-z]+$/);
    }
  });

  it("is between 2 and 24 characters", () => {
    for (let i = 0; i < 50; i++) {
      const name = generateRandomName();
      expect(name.length).toBeGreaterThanOrEqual(2);
      expect(name.length).toBeLessThanOrEqual(24);
    }
  });

  it("produces varied names across calls", () => {
    const names = new Set<string>();
    for (let i = 0; i < 30; i++) {
      names.add(generateRandomName());
    }
    // Should produce at least 5 distinct names out of 30 calls
    expect(names.size).toBeGreaterThanOrEqual(5);
  });
});
