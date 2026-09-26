const { chromium } = require("playwright");
require("node:fs").mkdirSync("test-results", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://localhost:4173");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: false });
  console.log("buttons", await page.locator(".chord-button").count());
  await page.locator("#power").click();
  await page.waitForFunction(
    () => document.querySelector("#sampleStatus").textContent.includes("ready"),
    null,
    { timeout: 60000 },
  );
  console.log(
    "sample status",
    await page.locator("#sampleStatus").textContent(),
  );
  await page.keyboard.down("r");
  await page.keyboard.down("v");
  console.log("combination", await page.locator("#statusText").textContent());
  await page.keyboard.up("v");
  await page.keyboard.up("r");
  await page.locator("#chordHold").click();
  await page.keyboard.press("r");
  const box = await page.locator("#strumplate").boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height - 3);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 3, { steps: 1 });
  console.log(
    "strum value",
    await page.locator("#strumplate").getAttribute("aria-valuenow"),
  );
  await page.mouse.up();
  await page.locator("#instantOff").click();
  await page.locator("#autoBass").click();
  await page.keyboard.press("r");
  await page.waitForTimeout(400);
  await page.keyboard.press("Space");
  await page.locator("#voiceSelectors .bank button").click();
  await page
    .locator("#voiceSelectors .selector")
    .nth(2)
    .locator("button")
    .click();
  await page.locator("#keyboard").click();
  await page.keyboard.down("r");
  await page.waitForTimeout(100);
  await page.keyboard.up("r");
  await page.locator("#instantOff").click();
  await page.locator("[data-midi-control=master]").focus();
  await page.keyboard.press("ArrowUp");
  console.log("master", await page.locator("#master").inputValue());
  for (const [name, width, height] of [
    ["wide", 1920, 1080],
    ["large", 2560, 1440],
    ["tablet", 1024, 768],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `test-results/${name}.png`, fullPage: false });
  }
  await page.locator("#fitToggle").click();
  await page.screenshot({
    path: "test-results/mobile-fit.png",
    fullPage: false,
  });
  console.log("errors", errors);
  await browser.close();
  if (errors.length) process.exitCode = 1;
})();
