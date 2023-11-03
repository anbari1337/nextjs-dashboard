import { test as setup, expect } from "@playwright/test";
require("dotenv").config();

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto(process.env.APP_URL);

  await page.getByRole("link", { name: "Log in" }).click();
  await page
    .getByPlaceholder("Enter your email address")
    .fill("user@nextmail.com");
  await page.getByPlaceholder("Enter password").fill("123456");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/.*dashboard/);

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});
