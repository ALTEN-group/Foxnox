import { expect, type Page, test } from "@playwright/test";
import { loginAs, openEntity } from "../../e2e/helpers/auth";
import { Director } from "../support/director";

const VIEW = "Security";
const HIDDEN = ["Password updated at", "Password expiry", "Created at"];
const SHOWN = ["Updated at"];

const preferencesDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Preferences management" });

/**
 * Deletes the user views left by previous runs, off camera. Locked views have no delete action.
 * Selecting a locked view then saving clones it, hence no switch back to one in the scenario.
 */
async function removeUserViews(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Configure columns" }).click();
  const dialog = preferencesDialog(page);
  await expect(
    dialog.getByRole("option", { name: "Default", exact: true }),
  ).toBeVisible();
  const views = dialog
    .getByRole("listbox")
    .first()
    .getByRole("option")
    .filter({ has: page.getByTitle("Delete") });
  for (let count = await views.count(); count > 0; count--) {
    const view = views.first();
    await view.hover();
    await view.getByTitle("Delete").click();
    // The confirmation opens behind the preferences dialog, so it is clicked through the DOM.
    await page.getByRole("button", { name: "Valider" }).dispatchEvent("click");
    await expect(views).toHaveCount(count - 1);
  }
  await dialog.getByRole("button", { name: /Cancel/ }).click();
  await expect(dialog).toBeHidden();
}

test("manage table preferences", async ({ context, page }) => {
  const director = await Director.on(context, page);
  await loginAs(page);
  await openEntity(page, "passwords");
  await removeUserViews(page);
  await expect(
    page.getByRole("columnheader", { name: /Password expiry/ }),
  ).toBeVisible();
  await director.action();
  await director.pause(1200);

  const configure = page.getByRole("button", { name: "Configure columns" });
  await director.click(configure, 1200);
  const dialog = preferencesDialog(page);

  // A new view starts from the current columns.
  await director.click(dialog.getByRole("button", { name: /Add/ }), 400);
  await director.type(dialog.getByRole("textbox"), VIEW, 400);
  await director.click(dialog.locator("button:has(.pi-check)").first(), 1000);
  await expect(
    dialog.getByRole("option", { name: VIEW, exact: true }),
  ).toBeVisible();

  for (const column of [...HIDDEN, ...SHOWN]) {
    await director.click(
      dialog.getByRole("option", { name: column, exact: true }),
      500,
    );
  }
  await director.pause(800);
  await director.click(dialog.getByRole("button", { name: /Save/ }), 0);
  await expect(dialog).toBeHidden();
  const updatedAt = page.getByRole("columnheader", { name: /Updated at/ });
  await expect(updatedAt).toBeVisible();
  await director.pause(1500);
  await director.hover(updatedAt);
  await director.pause(1500);

  // The view is stored server side: reopening it, one column comes back.
  await director.click(configure, 1000);
  await expect(
    dialog.getByRole("option", { name: VIEW, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await director.click(
    dialog.getByRole("option", { name: "Password expiry", exact: true }),
    800,
  );
  await director.click(dialog.getByRole("button", { name: /Save/ }), 0);
  const expiry = page.getByRole("columnheader", { name: /Password expiry/ });
  await expect(expiry).toBeVisible();
  await director.pause(800);
  await director.hover(expiry);
  await director.pause(2500);

  await director.save("admin-table-preferences");
});
