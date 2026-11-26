/**
 * Records a walkthrough of the live booking site for submission.
 * Output: demo-recording/demo.webm
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.DEMO_URL || "https://festival-booking-xi.vercel.app";
const outDir = path.resolve("demo-recording");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

const pause = (ms) => page.waitForTimeout(ms);

async function scrollInto(sel) {
  const el = page.locator(sel).first();
  if (await el.count()) await el.scrollIntoViewIfNeeded();
}

console.log("Opening", BASE);
await page.goto(BASE, { waitUntil: "networkidle" });
await pause(2000);

// --- Happy path ---
console.log("1) Happy path: adult + child tickets");
await page.getByRole("button", { name: "+ Add another person" }).click();
await pause(600);

const names = page.locator('input[id^="name-"]');
const ages = page.locator('input[id^="age-"]');
await names.nth(0).fill("Priya Sharma");
await ages.nth(0).fill("34");
await pause(400);
await names.nth(1).fill("Aarav Sharma");
await ages.nth(1).fill("8");
await pause(800);

// Pick a couple days for booker if day chips exist
const dayButtons = page.locator("button.chip");
if ((await dayButtons.count()) >= 2) {
  await dayButtons.nth(0).click();
  await pause(300);
  await dayButtons.nth(1).click();
}
await pause(1000);

await page.getByRole("button", { name: "Continue" }).click();
await pause(1200);

await page.locator("#email").fill("priya@example.com");
await page.locator("#phone").fill("555-0142");
await pause(800);

await page.getByRole("button", { name: "Review & pay" }).click();
await pause(1500);

await page.locator("#promo").fill("SEVA10");
await page.getByRole("button", { name: "Apply" }).click();
await pause(1500);

await page.getByRole("button", { name: /Pay/ }).click();
await pause(2500);

// Confirmation visible?
const confirmed = await page.getByText("Confirmed").count();
console.log("Confirmation shown:", confirmed > 0);
await pause(2000);

// Reload for failure demos
console.log("2) Sold-out All-Day Adult");
await page.goto(BASE, { waitUntil: "networkidle" });
await pause(1500);
await scrollInto("text=All-Day Pass");
await pause(2000);

console.log("3) Age mismatch: child on adult path prevented in UI");
await page.getByRole("button", { name: "+ Add another person" }).click();
await pause(400);
await names.nth(0).fill("Priya Sharma");
await ages.nth(0).fill("34");
await names.nth(1).fill("Kid");
await ages.nth(1).fill("7");
await pause(1500);

console.log("4) Expired / maxed / unknown promos");
await page.getByRole("button", { name: "Continue" }).click();
await pause(800);
await page.locator("#email").fill("priya@example.com");
await page.locator("#phone").fill("555-0142");
await page.getByRole("button", { name: "Review & pay" }).click();
await pause(1200);

for (const code of ["EXPIRED5", "MAXEDOUT", "NOTREAL"]) {
  await page.locator("#promo").fill(code);
  await page.getByRole("button", { name: "Apply" }).click();
  await pause(1400);
}

console.log("5) Garba wrong day rejected via quote errors if forced — show Nov 11/13 note");
await page.getByRole("button", { name: "Back" }).click();
await pause(800);
await scrollInto("text=Garba");
await pause(2000);

await pause(1500);
await context.close();
await browser.close();

const videos = fs.readdirSync(outDir).filter((f) => f.endsWith(".webm"));
if (!videos.length) {
  console.error("No video file produced");
  process.exit(1);
}
const src = path.join(outDir, videos[0]);
const dest = path.join(outDir, "sharad-utsav-demo.webm");
fs.renameSync(src, dest);
console.log("Saved:", dest);
console.log("Duration roughly covers happy path + sold-out + age + promos");
