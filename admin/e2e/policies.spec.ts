import { expect, test } from "@playwright/test";
import { loginAs, openEntity } from "./helpers/auth";

test.describe("Password policies CRUD", () => {
  test("creates a policy then archives it", async ({ page }) => {
    test.setTimeout(90_000);
    const name = `e2e-policy-${Date.now()}`;

    await loginAs(page);
    await openEntity(page, "policies");
    await expect(page.locator("#table-toolbar .toolbar-title")).toHaveText(
      "Password policies",
    );

    await page.locator("#table-toolbar button .pi-plus").click();
    const createDialog = page.getByRole("dialog", { name: "Create - Policy" });
    await expect(createDialog).toBeVisible();

    await createDialog.getByRole("textbox").first().fill(name);
    await createDialog.getByRole("textbox").nth(2).fill("!");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        /\/pwd\/policies\/?$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "POST",
    );
    await createDialog.getByRole("button", { name: "Submit" }).click();
    const createResponse = await createResponsePromise;
    expect(
      createResponse.ok(),
      `Create failed with HTTP ${createResponse.status()} for ${createResponse.request().postData()}: ${await createResponse.text()}`,
    ).toBeTruthy();
    await expect(createDialog).toBeHidden();
    await page.getByRole("button", { name: "Refresh data" }).click();

    const nameCell = page.getByRole("cell", { name });
    await expect(nameCell).toBeVisible({ timeout: 15_000 });
    await nameCell.click();

    const editDialog = page.getByRole("dialog");
    await editDialog.getByRole("button", { name: "Archive" }).click();
    const confirm = page.getByRole("alertdialog").filter({
      hasText: /archive this view/i,
    });
    await expect(confirm).toBeVisible();

    const archiveResponsePromise = page.waitForResponse(
      (response) =>
        /\/pwd\/policies\/archive\/?$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "POST",
    );
    await confirm.getByRole("button", { name: "Confirm" }).click();
    const archiveResponse = await archiveResponsePromise;
    expect(
      archiveResponse.ok(),
      `Archive failed with HTTP ${archiveResponse.status()} at ${archiveResponse.url()} for ${archiveResponse.request().postData()}: ${await archiveResponse.text()}`,
    ).toBeTruthy();

    await page.getByRole("button", { name: "Refresh data" }).click();
    await expect(page.getByRole("cell", { name })).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
