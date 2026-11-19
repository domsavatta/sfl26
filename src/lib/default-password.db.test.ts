import { expect, test } from "vitest";
import { createFixtures, testRequest } from "../../test/db";
import { getDefaultPassword } from "./default-password";

test("the current season's default password, or null when it isn't set", async () => {
  const f = await createFixtures(); // the newest current season, blank default password
  expect(await getDefaultPassword()).toBeNull();

  // The column's default is the text 'NULL', which isn't a real password.
  await testRequest().query(`update Season set defaultPassword = 'NULL' where SeasonID = ${f.seasonId}`);
  expect(await getDefaultPassword()).toBeNull();

  await testRequest().query(`update Season set defaultPassword = 'test-pw' where SeasonID = ${f.seasonId}`);
  expect(await getDefaultPassword()).toBe("test-pw");
});
