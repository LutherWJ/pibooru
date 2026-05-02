import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('testuser');
  await page.getByLabel('Password').fill('testpassword123');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForURL('/');
  await expect(page.locator('#search-box')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
