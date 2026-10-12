   import { test, expect } from "./support/fixtures";

test("a member can borrow a book", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Member name").fill("Samin");
  await page.getByRole("button", { name: "Borrow Clean Code" }).click();

  await expect(page.getByRole("status")).toHaveText("Samin borrowed Clean Code");
  await expect(page.getByText("2 copies available")).toBeHidden();
  await expect(page.getByText("1 copy left").first()).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Samin");
});