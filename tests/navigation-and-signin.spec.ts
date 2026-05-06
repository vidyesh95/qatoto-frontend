import { test, expect } from '@playwright/test';

test('navigation and sign in flow', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'toggle sidebar' }).click();
  await page.getByRole('link', { name: 'Qatoto' }).click();
  await page.getByRole('searchbox', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'translate' }).nth(1).click();
  await page.getByRole('button', { name: 'translate' }).nth(2).click();
  await page.getByRole('button', { name: 'translate' }).nth(3).click();
  await page.getByRole('link', { name: 'Anime Anime' }).click();
  await page.getByRole('link', { name: 'Store Store' }).click();
  await page.getByRole('link', { name: 'AI AI' }).click();
  await page.getByRole('link', { name: 'Home Home' }).click();
  await page.getByRole('link', { name: 'translate Sign in' }).click();
  await page.getByRole('heading', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Sign in with Password Sign in' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('link', { name: 'Forgot Password?' }).click();
  await page.getByRole('link', { name: 'Navigate back' }).click();
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Navigate back' }).click();
});
