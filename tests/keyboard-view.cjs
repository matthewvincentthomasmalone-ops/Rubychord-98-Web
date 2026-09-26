const assert = require("node:assert/strict");
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
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/app.js?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()) + "\nwindow.keyboardTestEngine = engine;",
    });
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4173/");
  assert.equal(
    (await page.locator("#statusText").textContent()).trim(),
    "Power on to start your Rubychord -98",
  );
  assert.equal(await page.locator(".computer-key").count(), 58);
  assert.equal(
    await page.locator("#keyboardOverlay").evaluate((el) => el.inert),
    true,
  );
  assert.equal(await page.locator("#instrument #instantOff").count(), 0);
  assert.equal(
    await page
      .locator("#instrument")
      .evaluate(
        (el) =>
          [...el.querySelectorAll("*")].filter((child) =>
            getComputedStyle(child).backgroundImage.includes(
              "repeating-linear-gradient",
            ),
          ).length,
      ),
    1,
  );
  const logo = await page.locator(".brand img").evaluate(async (img) => {
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0);
    return {
      width: img.naturalWidth,
      alpha: context.getImageData(0, 0, 1, 1).data[3],
    };
  });
  assert.ok(logo.width > 500);
  assert.equal(logo.alpha, 0);
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  for (const selector of [
    "#keyboardOverlay",
    "#computerKeyboard",
    ".computer-key",
  ])
    assert.equal(
      await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
  assert.equal(
    await page.locator("#keyboardOverlay").evaluate((el) => el.inert),
    false,
  );
  const layout = await page.evaluate(() => ({
    body: document.querySelector("#instrument").getBoundingClientRect().bottom,
    keyboard: document.querySelector("#keyboardOverlay").getBoundingClientRect()
      .top,
  }));
  assert.ok(layout.body < layout.keyboard);
  await page.screenshot({ path: "test-results/keyboard-open.png" });
  await page.locator("#power").click();
  await page.waitForFunction(() => keyboardTestEngine.playable);
  await page.keyboard.down("r");
  await page.keyboard.down("v");
  assert.equal(await page.locator(".computer-key.key-active").count(), 2);
  assert.ok((await page.locator("#statusText").textContent()).includes("CM7"));
  assert.equal(
    await page
      .locator("#keyboardToggle")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  const gradient = await page
    .locator('[data-code="KeyR"]')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  const alpha = [...gradient.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map(
    (match) => Number(match[1]),
  );
  assert.equal(alpha.length, 2);
  assert.ok(alpha.every((value) => value > 0 && value <= 0.5));
  await page.screenshot({ path: "test-results/keyboard-highlight.png" });
  await page.keyboard.up("v");
  await page.keyboard.up("r");
  assert.equal(await page.locator(".computer-key.key-active").count(), 0);
  for (const [letter, quality, code] of [
    ["p", "major", "KeyP"],
    [";", "minor", "Semicolon"],
    [":", "minor", "Semicolon"],
    ["/", "seventh", "Slash"],
    ["?", "seventh", "Slash"],
  ]) {
    await page.keyboard.down(letter);
    assert.equal(
      await page.locator(`[data-code="${code}"]`).getAttribute("aria-pressed"),
      "true",
    );
    const played = await page.evaluate(async () => {
      const e = keyboardTestEngine;
      await e.chordReady;
      const source = e.chordVoices[0]?.sources[0];
      const entry = e.samples.find(
        (s) => e.buffers.get(s.source) === source?.buffer,
      );
      return {
        root: e.chord.root,
        quality: e.chord.quality,
        recordedQuality: entry?.quality,
        recordedRoot: entry?.rootPC,
        rhythm: !!e.rhythmTimer,
      };
    });
    assert.deepEqual(played, {
      root: 6,
      quality,
      recordedQuality: quality,
      recordedRoot: 6,
      rhythm: false,
    });
    await page.keyboard.up(letter);
    assert.equal(
      await page.locator(`[data-code="${code}"]`).getAttribute("aria-pressed"),
      "false",
    );
  }
  const c = await page.locator('[data-code="KeyR"]').boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  assert.equal(
    await page.locator('[data-code="KeyR"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.evaluate(() => document.querySelector("#keyboardToggle").click());
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator("#keyboardOverlay").evaluate((el) => el.inert),
    true,
  );
  assert.equal(
    await page.evaluate(() => keyboardTestEngine.chordActive),
    false,
  );
  await page.mouse.up();
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  const number = await page.locator('[data-code="Digit1"]').boundingBox();
  await page.mouse.click(
    number.x + number.width / 2,
    number.y + number.height / 2,
  );
  assert.equal(
    await page.locator("#strumplate").getAttribute("aria-valuenow"),
    "1",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => {
    const panel = document.querySelector("#keyboardOverlay"),
      button = document
        .querySelector("#keyboardToggle")
        .getBoundingClientRect();
    return {
      scrollable: panel.scrollWidth > panel.clientWidth,
      center: button.x + button.width / 2,
      body: document.querySelector("#instrument").getBoundingClientRect().right,
    };
  });
  assert.ok(mobile.scrollable);
  assert.ok(Math.abs(mobile.center - 195) < 1);
  assert.ok(mobile.body < 391);
  await page.screenshot({ path: "test-results/keyboard-mobile.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator("#keyboardOverlay")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.locator("#power").click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: transparent slide-up keyboard; <50% pink fills; physical/pointer press and release; F♯/F♯m/F♯7 exact recorded chords; off-by-default drums; clean logo alpha; removed stripe; mobile and reduced motion.",
  );
  await browser.close();
})();
