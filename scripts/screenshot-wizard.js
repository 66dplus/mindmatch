// Click through the wizard and screenshot each step.
// Requires playwright. Install once: `npx playwright install chromium`.
// Run: `node scripts/screenshot-wizard.js`

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const URL = process.env.URL || 'https://66dplus.github.io/mindmatch/'
const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })

  await snap(page, '03-wizard-start', { fullPage: true })

  // Open wizard
  await page.getByRole('button', { name: /Записаться/i }).first().click()
  await page.waitForTimeout(800)
  await snap(page, '04-wizard-service')

  // Pick first service card
  await page.locator('.service-card').first().click()
  await page.waitForTimeout(400)
  await snap(page, '05-wizard-qualification')

  // Fill qualification
  const textareas = page.locator('.q-item textarea')
  await textareas.nth(0).fill('Чувствую, что застряла в работе — формально всё неплохо, но внутри ощущение, что иду не туда. Не могу решить, оставаться или искать новое.')
  await textareas.nth(1).fill('Пробовала составлять списки плюсов/минусов, общалась с друзьями. Помогает на день, потом возвращается.')
  await textareas.nth(2).fill('Хочу выйти с сессии с пониманием, как принимать такие решения в принципе.')
  await page.locator('.pill').nth(0).click() // "Да"
  await page.waitForTimeout(400)
  await snap(page, '06-wizard-qualification-filled')

  // Next: time slot
  await page.getByRole('button', { name: /Выбрать время/i }).click()
  await page.waitForTimeout(400)
  await snap(page, '07-wizard-slot')

  // Pick first available slot
  await page.locator('.slot-btn:not([disabled])').first().click()
  await page.waitForTimeout(400)
  await snap(page, '08-wizard-contact')

  // Fill contact
  await page.locator('input[type="text"]').fill('Анна Петрова')
  await page.locator('input[type="email"]').fill('anna@example.com')
  await page.waitForTimeout(300)
  await snap(page, '09-wizard-contact-filled')

  // Submit
  await page.getByRole('button', { name: /Получить диагностику/i }).click()
  await page.waitForTimeout(3000) // wait for mock diagnostic
  await snap(page, '10-wizard-confirm', { fullPage: true })

  await browser.close()
  console.log('Done. Screenshots in', OUT)
})()

async function snap(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, ...opts })
  console.log('→', file)
}
