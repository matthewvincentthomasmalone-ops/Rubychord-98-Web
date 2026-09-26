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
    (await page.locator("#powerPlaque").textContent()).trim(),
    "Power on to start Rubychord98",
  );
  assert.equal(await page.locator("#statusText").isVisible(), false);
  assert.deepEqual(
    await page.locator("#powerPlaque").evaluate((el) => ({
      tag: el.tagName,
      tabIndex: el.tabIndex,
      pointerEvents: getComputedStyle(el).pointerEvents,
    })),
    { tag: "P", tabIndex: -1, pointerEvents: "none" },
  );
  await page.keyboard.press("r");
  assert.equal(
    await page.locator("#power").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await page.locator("#powerPlaque").isVisible(), true);
  assert.equal(await page.locator(".computer-key").count(), 58);
  assert.equal(
    await page.locator("#keyboardOverlay").evaluate((el) => el.inert),
    true,
  );
  assert.equal(await page.locator("#instantOff").count(), 0);
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
  const instrumentBefore = await page.locator("#instrument").boundingBox();
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.locator("#instrument").boundingBox(),
    instrumentBefore,
  );
  assert.equal(
    await page
      .locator("#keyboardOverlay")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(255, 216, 230, 0.78)",
  );
  for (const selector of ["#computerKeyboard", ".computer-key"])
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
  const layout = await page.evaluate(() => {
    const panel = document
        .querySelector("#keyboardOverlay")
        .getBoundingClientRect(),
      toggle = document
        .querySelector("#keyboardToggle")
        .getBoundingClientRect(),
      fit = document.querySelector("#fitToggle").getBoundingClientRect();
    return {
      width: panel.width,
      left: panel.left,
      right: panel.right,
      fitRight: fit.right,
      controlGap: fit.left - toggle.right,
      belowPanel: toggle.top > panel.bottom,
      fitsKeys:
        document.querySelector("#keyboardOverlay").scrollWidth <= panel.width,
    };
  });
  assert.ok(layout.width <= 820);
  assert.ok(layout.left > 500);
  assert.ok(Math.abs(layout.right - layout.fitRight) < 1);
  assert.ok(layout.controlGap > 0 && layout.controlGap <= 24);
  assert.equal(layout.belowPanel, true);
  assert.equal(layout.fitsKeys, true);
  await page.screenshot({ path: "test-results/keyboard-open.png" });
  // Both modes use the same underlay; opening the keyboard never resizes the body.
  await page.locator("#fitToggle").click();
  await page.waitForTimeout(500);
  const fitKeyboard = await page
    .locator("#keyboardOverlay")
    .evaluate((panel) => ({
      background: getComputedStyle(panel).backgroundColor,
      overlaps:
        panel.getBoundingClientRect().top <
        document.querySelector("#instrument").getBoundingClientRect().bottom,
    }));
  assert.equal(fitKeyboard.background, "rgba(255, 216, 230, 0.78)");
  assert.equal(fitKeyboard.overlaps, true);
  await page.keyboard.down("r");
  const fitGradient = await page
    .locator('[data-code="KeyR"]')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  assert.ok(fitGradient.includes("rgba(199, 110, 146, 0.28)"));
  assert.ok(fitGradient.includes("rgba(139, 43, 81, 0.46)"));
  await page.screenshot({ path: "test-results/keyboard-fit-underlay.png" });
  await page.keyboard.up("r");
  const fitInstrumentBefore = await page.locator("#instrument").boundingBox();
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.locator("#instrument").boundingBox(),
    fitInstrumentBefore,
  );
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.locator("#instrument").boundingBox(),
    fitInstrumentBefore,
  );
  assert.equal(
    await page
      .locator("#keyboardOverlay")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(255, 216, 230, 0.78)",
  );
  await page.locator("#fitToggle").click();
  await page.waitForTimeout(500);
  assert.equal(
    await page
      .locator("#keyboardOverlay")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(255, 216, 230, 0.78)",
  );
  assert.deepEqual(
    await page.locator("#instrument").boundingBox(),
    instrumentBefore,
  );
  await page.locator("#power").click();
  assert.equal(await page.locator("#powerPlaque").isVisible(), false);
  assert.equal(await page.locator("#statusText").isVisible(), false);
  await page.waitForFunction(() => keyboardTestEngine.playable);
  assert.equal(await page.locator("#statusText").isVisible(), false);
  await page.keyboard.down("r");
  await page.keyboard.down("v");
  assert.equal(await page.locator(".computer-key.key-active").count(), 2);
  assert.equal(await page.locator("#statusText").textContent(), "CM7");
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
  assert.equal(await page.locator("#statusText").textContent(), "C");
  await page.keyboard.up("r");
  assert.equal(await page.locator("#statusText").isVisible(), false);
  assert.equal(await page.locator("#statusText").textContent(), "");
  // Controls and sample-loading messages cannot replace a held chord readout.
  // Close the overlay to reach the real-time controls beneath it.
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  await page.locator("#chordHold").click();
  await page.keyboard.press("r");
  await page.locator("#rhythmStart").click();
  await page.waitForFunction(() => !!keyboardTestEngine.rhythmTimer);
  assert.equal(await page.locator("#statusText").textContent(), "C");
  await page.locator("#rhythmStart").click();
  await page.locator("#autoBass").click();
  await page
    .locator("#voiceSelectors .selector")
    .nth(2)
    .locator("button")
    .click();
  assert.equal(await page.locator("#statusText").textContent(), "C");
  await page
    .locator("#voiceSelectors .selector")
    .nth(1)
    .locator("button")
    .click();
  await page.locator("#autoBass").click();
  await page.locator("#chordHold").click();
  assert.equal(await page.locator("#statusText").isVisible(), false);
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
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
  assert.equal(await page.locator("#statusText").isVisible(), false);
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
  await page.locator("#keyboard").click();
  await page.keyboard.down("r");
  assert.equal(await page.locator("#statusText").textContent(), "F3");
  await page.keyboard.up("r");
  assert.equal(await page.locator("#statusText").isVisible(), false);
  await page.locator("#keyboard").click();
  await page.keyboard.down("r");
  assert.equal(await page.locator("#statusText").textContent(), "C");
  await page.locator("#fitToggle").focus();
  await page.keyboard.press("Space");
  assert.equal(
    await page.locator("#fitToggle").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await page.evaluate(() => keyboardTestEngine.powered), true);
  assert.equal(await page.locator("#statusText").isVisible(), false);
  assert.equal(await page.locator("#statusText").textContent(), "");
  await page.keyboard.up("r");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => {
    const panel = document.querySelector("#keyboardOverlay"),
      button = document
        .querySelector("#keyboardToggle")
        .getBoundingClientRect();
    return {
      scrollable: panel.scrollWidth > panel.clientWidth,
      buttonLeft: button.left,
      buttonRight: button.right,
      fitLeft: document.querySelector("#fitToggle").getBoundingClientRect()
        .left,
      bodyWidth: document.querySelector("#instrument").getBoundingClientRect()
        .width,
      pageWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(mobile.scrollable);
  assert.ok(mobile.buttonLeft > 0 && mobile.buttonRight < mobile.fitLeft);
  assert.ok(mobile.bodyWidth >= 880);
  assert.ok(mobile.pageWidth <= 390);
  const mobileBefore = await page.locator("#instrument").boundingBox();
  await page.locator("#keyboardToggle").click();
  await page.locator("#keyboardToggle").click();
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.locator("#instrument").boundingBox(),
    mobileBefore,
  );
  await page.locator("#fitToggle").click();
  assert.ok((await page.locator("#instrument").boundingBox()).width < 391);
  await page.screenshot({ path: "test-results/keyboard-mobile.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator("#keyboardOverlay")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.locator("#power").click();
  assert.equal(await page.locator("#powerPlaque").isVisible(), true);
  assert.equal(await page.locator("#statusText").isVisible(), false);
  assert.equal(await page.locator(".below button").count(), 2);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: compact lower-right keyboard with adjacent controls; instrument size and position preserved in normal, Fit and mobile modes; pink underlay and translucent highlights in both modes; note readouts; pointer and physical keys; exact F♯ samples; off-by-default drums; clean logo; mobile and reduced motion.",
  );
  await browser.close();
})();
