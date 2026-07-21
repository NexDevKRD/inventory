# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> super admin logs in, creates a user, assigns a role, logs out
- Location: test\e2e\smoke.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('select[name=roleIds]')
    - locator resolved to <select multiple name="roleIds" class="w-full rounded border px-3 py-2"></select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    55 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - heading "Super Admin" [level=2] [ref=e4]
      - navigation [ref=e5]:
        - link "Dashboard" [ref=e6] [cursor=pointer]:
          - /url: /admin/dashboard
        - link "Users" [ref=e7] [cursor=pointer]:
          - /url: /admin/users
        - link "Roles & Permissions" [ref=e8] [cursor=pointer]:
          - /url: /admin/roles
        - link "Audit Logs" [ref=e9] [cursor=pointer]:
          - /url: /admin/audit-logs
        - link "Products (coming soon)" [ref=e10]:
          - /url: "#"
        - link "Warehouses (coming soon)" [ref=e11]:
          - /url: "#"
        - link "Settings (coming soon)" [ref=e12]:
          - /url: "#"
    - generic [ref=e13]:
      - banner [ref=e14]:
        - generic [ref=e15]:
          - combobox [ref=e16]:
            - option "EN" [selected]
            - option "AR"
            - option "KU"
          - button "🌓" [ref=e17] [cursor=pointer]
          - button "notifications" [ref=e18] [cursor=pointer]: 🔔
          - button "Log out" [ref=e19] [cursor=pointer]
      - main [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]:
            - heading "Users" [level=1] [ref=e23]
            - button "New user" [ref=e24] [cursor=pointer]
          - generic [ref=e25]:
            - paragraph [ref=e26]: No results
            - paragraph [ref=e27]: Try adjusting your filters.
          - generic [ref=e31]:
            - heading "New user" [level=3] [ref=e32]
            - generic [ref=e33]:
              - generic [ref=e34]: Email
              - textbox "Email" [ref=e35]: e2e.1784664583441@example.com
            - generic [ref=e36]:
              - generic [ref=e37]: First name
              - textbox "First name" [ref=e38]: E2E
            - generic [ref=e39]:
              - generic [ref=e40]: Last name
              - textbox "Last name" [active] [ref=e41]: Test
            - generic [ref=e42]:
              - generic [ref=e43]: Role
              - listbox "Role" [ref=e44]
            - button "Create" [ref=e45] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e46]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('super admin logs in, creates a user, assigns a role, logs out', async ({ page }) => {
  4  |   await page.goto('/login');
  5  |   await page.getByLabel('email').fill('admin@inventory.local');
  6  |   await page.getByLabel('password').fill('ChangeMe123!');
  7  |   await page.getByRole('button', { name: /log in/i }).click();
  8  | 
  9  |   await expect(page).toHaveURL(/dashboard/);
  10 | 
  11 |   await page.goto('/admin/users');
  12 |   await page.getByRole('button', { name: /new user/i }).click();
  13 |   const email = `e2e.${Date.now()}@example.com`;
  14 |   await page.locator('input[name=email]').fill(email);
  15 |   await page.locator('input[name=firstName]').fill('E2E');
  16 |   await page.locator('input[name=lastName]').fill('Test');
> 17 |   await page.locator('select[name=roleIds]').selectOption({ label: 'DOCTOR' });
     |                                              ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  18 |   await page.getByRole('button', { name: /^create$/i }).click();
  19 | 
  20 |   await expect(page.getByText(email)).toBeVisible();
  21 | 
  22 |   await page.getByRole('button', { name: /log out/i }).click();
  23 |   await expect(page).toHaveURL(/login/);
  24 | });
  25 | 
```