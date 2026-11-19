import crypto from "node:crypto";
import { describe, expect, test } from "vitest";
import { hash, validate } from "./asp-dot-net-password";

/** Builds an ASP.NET hash independently, from a known salt. */
function aspNetHash(password: string, salt: Buffer) {
  const subkey = crypto.pbkdf2Sync(password, salt, 1000, 32, "sha1");
  return Buffer.concat([Buffer.from([0]), salt, subkey]).toString("base64");
}

describe("validate", () => {
  test("accepts the right password for an ASP.NET hash", () => {
    const stored = aspNetHash("hunter22", Buffer.alloc(16, 7));
    expect(stored).toHaveLength(68); // the length stored in webpages_Membership
    expect(validate("hunter22", stored)).toBe(true);
    expect(validate("hunter23", stored)).toBe(false);
    expect(validate("", stored)).toBe(false);
  });

  test("rejects missing or malformed hashes", () => {
    const stored = aspNetHash("hunter22", Buffer.alloc(16, 7));
    for (const bad of ["", "undefined", "AAAA", stored.slice(0, 24), `AQ${stored.slice(2)}`]) {
      expect(validate("hunter22", bad)).toBe(false);
    }
  });
});

describe("hash", () => {
  test("produces the ASP.NET format, and validates", () => {
    const stored = hash("correct horse");
    const bytes = Buffer.from(stored, "base64");
    expect(bytes).toHaveLength(49);
    expect(bytes[0]).toBe(0);
    expect(stored).toBe(aspNetHash("correct horse", bytes.subarray(1, 17)));
    expect(validate("correct horse", stored)).toBe(true);
    expect(validate("correct horsE", stored)).toBe(false);
  });

  test("uses a new salt each time", () => {
    expect(hash("same")).not.toBe(hash("same"));
  });
});
