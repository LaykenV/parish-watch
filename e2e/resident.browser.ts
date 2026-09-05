import { expect, test } from '@playwright/test'

const issuePath = '/issues/pafford-ems-ambulance-contract-award-and-december-2025-required-report-6b14cb3d'

test('accepted evidence opens by keyboard and returns focus under reduced motion', async ({ page }, testInfo) => {
  await page.goto(issuePath)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pafford')
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  const trigger = page.getByRole('button', { name: /^Source / }).first()
  await trigger.press('Enter')
  const source = testInfo.project.name === 'mobile-webkit'
    ? page.getByRole('dialog', { name: 'Official source', exact: true })
    : page.getByRole('region', { name: 'Official source', exact: true })
  await expect(source).toBeVisible()
  await expect(source.getByRole('link', { name: /original|official document/i })).toHaveAttribute('href', /^https:\/\/rppj\.com\//)
  await page.keyboard.press('Escape')
  await expect(source).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('follow dialog keeps keyboard focus inside and closes without signing in', async ({ page }) => {
  await page.goto('/issues/roundabout-funding-at-bluebonnet-and-harveston-way-824dde42')
  const trigger = page.getByRole('button', { name: 'Follow this issue', exact: true })
  await trigger.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Get updates about this issue' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

for (const width of [320, 375]) test(`public coverage fits ${width} pixels and exposes body limitations`, async ({ page }) => {
  await page.setViewportSize({ width, height: 812 })
  await page.goto('/coverage')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source health, body by body')
  await expect(page.getByText('Lafayette Hearing Examiner', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByText(/This body has not completed|Coverage includes|Previously accepted evidence/).first()).toBeVisible()
})
