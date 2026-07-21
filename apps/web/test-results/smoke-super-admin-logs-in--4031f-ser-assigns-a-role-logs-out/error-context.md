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
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('email')

```

# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e7]:
          - button "previous" [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - button "next" [disabled] [ref=e11]:
            - img "next" [ref=e12]
          - generic [ref=e14]: 1 of 1 error
          - generic [ref=e15]:
            - text: Next.js (14.2.35) is outdated
            - link "(learn more)" [ref=e17] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
      - heading "Unhandled Runtime Error" [level=1] [ref=e23]
      - paragraph [ref=e24]: "Error: useAuth must be used within AuthProvider"
    - generic [ref=e25]:
      - heading "Source" [level=2] [ref=e26]
      - generic [ref=e27]:
        - link "src\\lib\\AuthContext.tsx (45:19) @ useAuth" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: src\lib\AuthContext.tsx (45:19) @ useAuth
          - img [ref=e31]
        - generic [ref=e35]: "43 | export const useAuth = () => { 44 | const ctx = useContext(AuthContext); > 45 | if (!ctx) throw new Error('useAuth must be used within AuthProvider'); | ^ 46 | return ctx; 47 | }; 48 |"
      - heading "Call Stack" [level=2] [ref=e36]
      - button "Show collapsed frames" [ref=e37] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('super admin logs in, creates a user, assigns a role, logs out', async ({ page }) => {
  4  |   await page.goto('/login');
> 5  |   await page.getByLabel('email').fill('admin@inventory.local');
     |                                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  17 |   await page.locator('select[name=roleIds]').selectOption({ label: 'DOCTOR' });
  18 |   await page.getByRole('button', { name: /^create$/i }).click();
  19 | 
  20 |   await expect(page.getByText(email)).toBeVisible();
  21 | 
  22 |   await page.getByRole('button', { name: /log out/i }).click();
  23 |   await expect(page).toHaveURL(/login/);
  24 | });
  25 | 
```