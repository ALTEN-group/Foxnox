import { expect, test } from "@playwright/test";
import { loginAs, openEntity } from "./helpers/auth";

const TABLE_PAGES = [
  { path: "passwords", title: "Passwords" },
  { path: "policies", title: "Password policies" },
  { path: "tokens", title: "Tokens" },
  { path: "trustedDevices", title: "Trusted devices" },
] as const;

test.describe("Authenticated navigation", () => {
  test("entity pages and not-found load", async ({ page }) => {
    await loginAs(page);

    for (const { path, title } of TABLE_PAGES) {
      await openEntity(page, path);
      await expect(page.locator("#table-toolbar .toolbar-title")).toHaveText(
        title,
      );
    }

    await page.goto("this-route-does-not-exist");
    await expect(page).toHaveURL(/\/not-found/);
    await expect(page.getByText("Not Found")).toBeVisible();
  });
});
