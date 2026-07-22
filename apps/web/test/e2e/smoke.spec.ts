import { test, expect } from '@playwright/test';

test('super admin logs in, creates a user, assigns a role, logs out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('email').fill('admin@inventory.local');
  await page.getByLabel('password').fill('ChangeMe123!');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page).toHaveURL(/dashboard/);

  // Navigate via in-app link (not page.goto) to preserve the in-memory auth session.
  await page.getByRole('link', { name: /^users$/i }).click();
  await expect(page).toHaveURL(/\/admin\/users/);
  await page.getByRole('button', { name: /new user/i }).click();
  const email = `e2e.${Date.now()}@example.com`;
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=firstName]').fill('E2E');
  await page.locator('input[name=lastName]').fill('Test');
  await page.locator('select[name=roleIds]').selectOption({ label: 'DOCTOR' });
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/login/);
});
