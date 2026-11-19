import sql from "mssql";
import { describe, expect, test } from "vitest";
import { hash, validate } from "@/lib/asp-dot-net-password";
import { createFixtures, testRequest } from "../../test/db";
import { changeEmail, changePassword, getAccount } from "./account";
import { signInUser } from "./user";

const PASSWORD = "old-password";

/** A fixture player with a sign-in password and an email. */
async function playerWithLogin() {
  const f = await createFixtures();
  await testRequest()
    .input("playerId", sql.Int, f.playerId)
    .input("password", sql.NVarChar, hash(PASSWORD))
    .query(`
      update Player set Email = 'old@example.com' where PlayerId = @playerId;
      insert into webpages_Membership (UserId, CreateDate, IsConfirmed, Password, PasswordSalt)
      values (@playerId, getutcdate(), 1, @password, '')`);
  return f;
}

async function membership(playerId: number) {
  const result = await testRequest()
    .input("playerId", sql.Int, playerId)
    .query<{ password: string; changed: Date | null }>(
      `select Password password, PasswordChangedDate changed
       from webpages_Membership where UserId = @playerId`,
    );
  return result.recordset[0];
}

describe("getAccount", () => {
  test("returns the name and email", async () => {
    const f = await playerWithLogin();
    expect(await getAccount(f.playerId)).toEqual({
      playerName: "Test Player",
      email: "old@example.com",
    });
  });

  test("an empty email is null", async () => {
    const f = await createFixtures();
    await testRequest().query(`update Player set Email = '' where PlayerId = ${f.playerId}`);
    expect((await getAccount(f.playerId))?.email).toBeNull();
  });
});

describe("changeEmail", () => {
  test("changes it with the right password", async () => {
    const f = await playerWithLogin();
    expect(await changeEmail(f.playerId, PASSWORD, "new@example.com")).toBe("ok");
    expect((await getAccount(f.playerId))?.email).toBe("new@example.com");
  });

  test("doesn't change it with the wrong password", async () => {
    const f = await playerWithLogin();
    expect(await changeEmail(f.playerId, "wrong", "new@example.com")).toBe("wrong-password");
    expect((await getAccount(f.playerId))?.email).toBe("old@example.com");
  });

  test("a player without a login can't change it", async () => {
    const f = await createFixtures(); // no webpages_Membership row
    expect(await changeEmail(f.playerId, "", "new@example.com")).toBe("wrong-password");
  });
});

describe("changePassword", () => {
  test("changes it with the right password; sign-in uses the new one", async () => {
    const f = await playerWithLogin();
    const before = await membership(f.playerId);

    expect(await changePassword(f.playerId, PASSWORD, "brand-new-password")).toBe("ok");

    const after = await membership(f.playerId);
    expect(after.password).not.toBe(before.password);
    expect(validate("brand-new-password", after.password)).toBe(true);
    expect(after.changed).not.toBeNull();
    expect(await signInUser("Test Player", "brand-new-password")).toMatchObject({
      playerId: f.playerId,
    });
    expect(await signInUser("Test Player", PASSWORD)).toBeNull();
  });

  test("doesn't change it with the wrong password", async () => {
    const f = await playerWithLogin();
    const before = await membership(f.playerId);

    expect(await changePassword(f.playerId, "wrong", "brand-new-password")).toBe("wrong-password");
    expect((await membership(f.playerId)).password).toBe(before.password);
  });

  test("only changes this player's password", async () => {
    const f = await playerWithLogin();
    await testRequest()
      .input("playerId", sql.Int, f.outsiderId)
      .input("password", sql.NVarChar, hash("outsider-password"))
      .query(`insert into webpages_Membership (UserId, Password, PasswordSalt)
        values (@playerId, @password, '')`);

    await changePassword(f.playerId, PASSWORD, "brand-new-password");

    expect(validate("outsider-password", (await membership(f.outsiderId)).password)).toBe(true);
  });
});
