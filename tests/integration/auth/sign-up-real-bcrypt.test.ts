import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { getTestDb } from "../../helpers/db";
import { signUp } from "@/lib/actions/auth";
import { makeUser } from "../../helpers/factories";

describe("signUp — real bcrypt hashing round-trip", () => {
  it("persists a user with a valid bcrypt hash", async () => {
    const result = await signUp({
      name: "Jane Tester",
      email: "jane@example.com",
      password: "StrongPass1",
    });
    expect(result).toEqual({ success: true });

    const db = getTestDb();
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "jane@example.com"),
    });
    expect(user).toBeDefined();
    expect(user!.hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt signature
    expect(await bcrypt.compare("StrongPass1", user!.hashedPassword!)).toBe(true);
    expect(await bcrypt.compare("wrong", user!.hashedPassword!)).toBe(false);
  });

  it("rejects a weak password at the validation layer", async () => {
    const result = await signUp({
      name: "Weak User",
      email: "weak@example.com",
      password: "short",
    });
    expect("error" in result).toBe(true);

    const db = getTestDb();
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "weak@example.com"),
    });
    expect(user).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    await makeUser({ email: "dup@example.com" });
    const result = await signUp({
      name: "Dupe",
      email: "dup@example.com",
      password: "StrongPass1",
    });
    expect("error" in result).toBe(true);
  });
});
