import { test as setup, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const MEMBER_STATE = "playwright/.auth/member.json";

setup("sign in as member", async ({ page }) => {
  // Fresh throwaway account each run, so no password lives in the repo.
  const username = "member";
  const password = randomUUID();

  await page.goto("/login.html");

  const signup = page.getByRole("form", { name: "Sign up" });
  await signup.getByLabel("Username").fill(username);
  await signup.getByLabel("Password").fill(password);
  await signup.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Account created")).toBeVisible();

  const form = page.getByRole("form", { name: "Sign in" });
  await form.getByLabel("Username").fill(username);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Signed in as")).toBeVisible();

  await page.context().storageState({ path: MEMBER_STATE });
});