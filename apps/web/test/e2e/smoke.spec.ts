import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@inventory.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('email').fill(ADMIN_EMAIL);
  await page.getByLabel('password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test('super admin logs in, creates a user, then logs out', async ({ page }) => {
  await login(page);

  await page.goto('/admin/users');
  await page.getByRole('button', { name: /new user/i }).click();

  const email = `e2e.${Date.now()}@example.com`;
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=firstName]').fill('E2E');
  await page.locator('input[name=lastName]').fill('Test');
  await page.locator('select[name=roleIds]').selectOption({ label: 'DOCTOR' });
  await page.getByRole('button', { name: /create user/i }).click();

  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/login/);
});

test('unauthenticated visitors are redirected to login', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/login/);
});

test('role permissions can be inspected', async ({ page }) => {
  await login(page);

  await page.goto('/admin/roles');
  await page.getByRole('button', { name: /SUPER_ADMIN/ }).click();
  await expect(page.getByText(/permissions granted/i)).toBeVisible();
});
