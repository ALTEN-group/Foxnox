import { expect, test } from "@playwright/test";
import { getAdminCredentials } from "../../e2e/helpers/credentials";
import { Director } from "../support/director";

test("sign in to the admin", async ({ context, page }) => {
  const { email, password } = getAdminCredentials();
  const director = await Director.on(context, page);
  await page.goto("login");
  await expect(page.locator("#emailInput")).toBeVisible();
  await director.action();
  await director.pause(1000);

  await director.type(page.locator("#emailInput"), email);
  await director.type(page.locator("#passwordInput"), password, 800);

  await director.click(page.getByRole("button", { name: "Se connecter" }), 0);
  await expect(page).toHaveURL(/\/passwords/, { timeout: 30_000 });
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await director.pause(1500);

  // Quick tour of the sidenav.
  for (const label of [/Policies/, /Security questions/, /Audit log/]) {
    await director.click(page.getByRole("link", { name: label }).first(), 0);
    await expect(page.getByRole("row").nth(1)).toBeVisible();
    await director.pause(1500);
  }

  await director.save("admin-login");
});
