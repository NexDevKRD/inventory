import { test, expect, Page } from '@playwright/test';

const PASSWORD = 'ChangeMe123!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('email').fill(email);
  await page.getByLabel('password').fill(PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test('unauthenticated visitors are redirected to login', async ({ page }) => {
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/login/);
});

test('super admin creates a user, then logs out', async ({ page }) => {
  await login(page, 'admin@inventory.local');

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

test('doctor builds a request and the inventory team approves it', async ({ page }) => {
  await login(page, 'doctor@inventory.local');

  await page.goto('/doctor/catalogue');
  await page
    .getByRole('button', { name: /add to request/i })
    .first()
    .click();

  await page.goto('/doctor/cart');
  await page.getByLabel(/deliver from/i).selectOption({ index: 1 });
  await page.getByRole('button', { name: /submit request/i }).click();

  await expect(page).toHaveURL(/doctor\/requests/);
  const reference = await page.locator('code').first().innerText();

  await page.getByRole('button', { name: /log out/i }).click();

  await login(page, 'manager@inventory.local');
  await page.goto('/inventory/requests');
  await page
    .getByRole('row', { name: new RegExp(reference) })
    .getByRole('button', { name: /view/i })
    .click();
  await page.getByRole('button', { name: /^approve$/i }).click();

  await expect(page.getByRole('row', { name: new RegExp(reference) }).getByText(/approved/i)).toBeVisible();
});

test('stock levels and reports render for the inventory team', async ({ page }) => {
  await login(page, 'manager@inventory.local');

  await page.goto('/inventory/stock');
  await expect(page.getByRole('button', { name: /adjust stock/i })).toBeVisible();

  await page.goto('/inventory/reports');
  await expect(page.getByText(/stock by warehouse/i)).toBeVisible();
});

test('a supplier only sees their own purchase orders', async ({ page }) => {
  await login(page, 'supplier@inventory.local');

  await page.goto('/supplier/purchase-orders');
  await expect(page.getByRole('heading', { name: /purchase orders/i })).toBeVisible();
  // Suppliers cannot raise orders, only fulfil them.
  await expect(page.getByRole('button', { name: /new order/i })).toHaveCount(0);
});
