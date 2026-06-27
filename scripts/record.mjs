import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const URL = "http://localhost:3000";
const OUT = "docs/video";
const SHOTS = "docs";

const CVS = [
  "sample-cvs/ADEL_ATYA_CV.pdf",
  "sample-cvs/DANIEL_OKORO_CV.pdf",
  "sample-cvs/MAYA_TRAN_CV.pdf",
].map((p) => path.resolve(p));

// HR persona conversation
const TURNS = [
  "Hi! I'm an HR manager hiring an AI & Automation Engineer. I've uploaded three candidate CVs — what are their names?",
  "Which candidate is the best fit for this role, and why?",
  "Good to know. What are Maya Tran's main skills?",
];

const READ_MS = 7000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 860 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 860 } },
});
const page = await context.newPage();

async function waitForAnswerComplete(prevCount) {
  for (let i = 0; i < 120; i++) {
    const c = await page.getByText("Cited sources").count();
    if (c > prevCount) return c;
    await sleep(500);
  }
  return page.getByText("Cited sources").count();
}

try {
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(1600);

  // 1) Upload three candidate CVs (sidebar fills up)
  for (const cv of CVS) {
    await page.locator("input[type=file]").setInputFiles(cv);
    await page.getByText(path.basename(cv)).first().waitFor({ timeout: 60000 });
    await sleep(1100);
  }
  await sleep(1500);
  await page.screenshot({ path: `${SHOTS}/shot-hr-uploaded.png` });

  // 2) HR conversation
  let cites = 0;
  for (let t = 0; t < TURNS.length; t++) {
    const ta = page.locator("textarea");
    await ta.click();
    await ta.type(TURNS[t], { delay: 14 });
    await sleep(450);
    await ta.press("Enter");

    cites = await waitForAnswerComplete(cites);
    await sleep(900);
    await page.screenshot({ path: `${SHOTS}/shot-hr-${t + 1}.png` });
    await sleep(READ_MS);
  }

  // 3) Open a citation to reveal the source passage
  const chip = page.locator("button", { hasText: "_CV.pdf" }).last();
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  await sleep(1200);
  await page.screenshot({ path: `${SHOTS}/shot-hr-citation.png` });
  await sleep(3200);
} catch (err) {
  console.error("recording error:", err);
} finally {
  await context.close();
  await browser.close();
}

const file = fs.readdirSync(OUT).find((f) => f.endsWith(".webm"));
console.log("VIDEO:", file ? `${OUT}/${file}` : "none");
