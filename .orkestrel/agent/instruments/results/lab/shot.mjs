import { chromium } from '/home/user/desk/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const errors = []
for (const [name, width, scheme] of [['desktop-light', 1200, 'light'], ['phone-dark', 390, 'dark']]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme })
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`) })
  await page.goto('file://' + process.cwd() + '/preview.html')
  await page.waitForTimeout(800)
  console.log(name, 'overflow', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
  await page.screenshot({ path: `${name}.png`, fullPage: true })
}
console.log('errors', JSON.stringify(errors))
await browser.close()
