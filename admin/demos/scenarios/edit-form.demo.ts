import { expect, type Page, test } from "@playwright/test";
import { loginAs, openEntity } from "../../e2e/helpers/auth";
import { Director } from "../support/director";

const POLICY = "Standard";
/** Seeded values of the Standard policy: min len, expiry (days), max failed attempts. */
const SEED = ["12", "0", "5"];
const EDITED = ["14", "90", "3"];

const editDialog = (page: Page) =>
  page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Edit - Policy" }),
  });

const waitForUpdate = (page: Page) =>
  page.waitForResponse(
    (response) =>
      /\/foxnox\/policies/.test(new URL(response.url()).pathname) &&
      ["PUT", "PATCH"].includes(response.request().method()),
  );

/** Puts the seeded values back off camera, so the scenario can be filmed again. */
async function resetPolicy(page: Page): Promise<void> {
  await page.getByRole("cell", { name: POLICY, exact: true }).click();
  const dialog = editDialog(page);
  const fields = dialog.getByRole("spinbutton");
  await expect(fields.first()).toBeVisible();
  const values = await Promise.all(
    SEED.map((_, i) => fields.nth(i).inputValue()),
  );
  if (values.every((value, i) => value === SEED[i])) {
    await dialog.getByRole("button", { name: "Cancel" }).click();
  } else {
    for (const [i, value] of SEED.entries()) await fields.nth(i).fill(value);
    // The dialog model is fed by a 300ms-debounced stream.
    await page.waitForTimeout(500);
    const update = waitForUpdate(page);
    await dialog.getByRole("button", { name: "Submit" }).click();
    expect((await update).ok()).toBeTruthy();
    await page.getByRole("button", { name: "Refresh data" }).click();
  }
  await expect(dialog).toBeHidden();
}

test("edit a password policy", async ({ context, page }) => {
  const director = await Director.on(context, page);
  await loginAs(page);
  await openEntity(page, "policies");
  await resetPolicy(page);
  await director.action();
  await director.pause(1000);

  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: POLICY, exact: true }),
  });
  await director.hover(row);
  await director.pause(600);
  await director.click(
    row.getByRole("cell", { name: POLICY, exact: true }),
    1200,
  );

  const dialog = editDialog(page);
  const fields = dialog.getByRole("spinbutton");
  await expect(fields.first()).toHaveValue(SEED[0]);
  for (const [i, value] of EDITED.entries()) {
    await director.type(fields.nth(i), value, 700);
  }
  await director.pause(800);

  const update = waitForUpdate(page);
  await director.click(dialog.getByRole("button", { name: "Submit" }), 0);
  expect((await update).ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
  await director.click(page.getByRole("button", { name: "Refresh data" }), 0);
  await expect(
    row.getByRole("cell", { name: EDITED[0], exact: true }),
  ).toBeVisible();
  await director.pause(600);
  await director.hover(row.getByRole("cell", { name: EDITED[0], exact: true }));
  await director.pause(2500);

  await director.save("admin-edit-form");
});
