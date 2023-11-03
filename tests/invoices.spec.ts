import { test, expect } from "@playwright/test";
require("dotenv").config();

test("Invoice page", async ({ page }) => {
  await page.goto(`${process.env.APP_URL}/dashboard`);
  await page.getByRole("link", { name: "Invoices" }).click();

  await expect(page).toHaveURL(/.*invoices/);
  await expect(await page.getByTestId("Invoices")).toBeVisible();
});
