import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('landing page renders the CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Ninety days/i)
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('login page renders the form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
  })

  test('protected routes redirect to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('health endpoint is green', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})
