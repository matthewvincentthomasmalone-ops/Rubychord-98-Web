const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Observe the real app engine without exposing a production test hook.
  await page.route("**/app.js?*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()) + "\nwindow.rhythmTestEngine = engine;",
    });
  });
  let release;
  const chordGate = new Promise((resolve) => (release = resolve));
  await page.route("**/Samples/Chords/Chords_1D.flac", async (route) => {
    await chordGate;
    await route.continue();
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4173/");
  assert.equal(
    await page.locator("#syncStart").getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(
    await page
      .locator("#syncLight")
      .evaluate((el) => el.classList.contains("on")),
    false,
  );
  await page.locator("#power").click();
  await page.waitForFunction(() => rhythmTestEngine.playable);
  const running = () => page.evaluate(() => !!rhythmTestEngine.rhythmTimer);
  const volume = () => page.locator("#rhythm").inputValue();
  const waitStarted = () =>
    page.waitForFunction(() => !!rhythmTestEngine.rhythmTimer);
  const waitStopped = () =>
    page.waitForFunction(() => !rhythmTestEngine.rhythmTimer);
  const cMajor = page.locator('[data-root="0"][data-quality="major"]');
  const stopRhythm = async () => {
    const before = await volume();
    await page.locator("#rhythmStart").click();
    await waitStopped();
    await page.waitForTimeout(90);
    assert.equal(await volume(), before);
    assert.equal(
      await page.locator("#rhythmStart").getAttribute("aria-label"),
      "Start rhythm",
    );
    assert.equal(
      await page.evaluate(() =>
        [...rhythmTestEngine.voices].some((v) => v.role === "rhythm"),
      ),
      false,
    );
  };
  assert.equal(await running(), false);

  // Fresh power-on and chord/keyboard input cannot start drums by default.
  await cMajor.click();
  await page.keyboard.press("p");
  await page.waitForTimeout(150);
  assert.equal(await running(), false);
  assert.equal(
    await page.evaluate(() => rhythmTestEngine.settings.sync),
    false,
  );
  await page.locator("#syncStart").click();
  assert.equal(await running(), false);

  // Explicitly armed Sync latches on a quick tap, independently of a pending chord download.
  await page.locator('[data-root="2"][data-quality="major"]').click();
  await waitStarted();
  assert.equal(await page.evaluate(() => rhythmTestEngine.chordActive), false);
  assert.equal(
    await page.evaluate(() =>
      rhythmTestEngine.buffers.has(
        rhythmTestEngine.samples.find((s) => s.source.endsWith("Chords_1D.wav"))
          .source,
      ),
    ),
    false,
  );
  assert.equal(
    await page.locator("#rhythmStart").getAttribute("aria-label"),
    "Stop rhythm",
  );
  await stopRhythm();
  release();
  await page.waitForTimeout(200);
  assert.equal(await running(), false);

  // Stop keeps drums off across new chord presses, until Sync is armed again.
  await cMajor.click();
  await page.waitForTimeout(150);
  assert.equal(await running(), false);
  await page.locator("#syncStart").click();
  assert.equal(await running(), false);
  await cMajor.click();
  await waitStarted();
  await page.evaluate(
    () => (window.originalTimer = rhythmTestEngine.rhythmTimer),
  );
  await page
    .locator("#patternSelectors .selector")
    .nth(2)
    .locator("button")
    .click();
  await page.locator("#keyboard").click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    await page.evaluate(() => rhythmTestEngine.rhythmTimer === originalTimer),
    true,
  );
  await stopRhythm();
  await page.locator("#syncStart").click();
  await cMajor.click(); // Sampled keyboard note in keyboard mode.
  await waitStarted();
  // Space must stop everything even while a chord button retains focus.
  await page.keyboard.press("Space");
  await waitStopped();
  assert.equal(await volume(), "0.4");
  assert.equal(await page.evaluate(() => rhythmTestEngine.midiVoices.size), 0);

  // Start begins immediately, then the same control stops it at unchanged volume.
  await page.locator("#rhythmStart").click();
  await waitStarted();
  assert.equal(await page.evaluate(() => rhythmTestEngine.chord), null);
  await stopRhythm();
  await page.locator("#rhythmStart").click();
  await waitStarted();
  // A focused Rhythm button must not restart drums on Space release.
  await page.keyboard.press("Space");
  await waitStopped();
  assert.equal(await volume(), "0.4");

  // Sync can be explicitly re-armed after stopping continuous Start mode.
  await page.locator("#syncStart").click();

  // Releasing one key of a held combination must not undo a manual stop.
  await page.locator("#keyboard").click();
  await page.keyboard.down("r");
  await page.keyboard.down("v");
  await waitStarted();
  await stopRhythm();
  await page.keyboard.up("v");
  await page.waitForTimeout(100);
  assert.equal(await running(), false);
  await page.keyboard.up("r");
  await page.locator("#autoBass").click();
  assert.equal(await running(), false);
  await cMajor.click();
  await page.waitForTimeout(150);
  assert.equal(await running(), false);
  await page.locator("#syncStart").click();
  await cMajor.click();
  await waitStarted();
  await page.locator("#power").click();
  await page.waitForFunction(() => rhythmTestEngine.ctx.state === "suspended");
  assert.equal(await running(), false);

  // Power cycles keep manually stopped drums off.
  await page.locator("#syncStart").click(); // disarm current Sync mode
  await page.locator("#power").click();
  await page.waitForFunction(() => rhythmTestEngine.ctx.state === "running");
  assert.equal(await running(), false);
  await page.locator("#power").click();

  // Explicit stop/power cycle cancels a Sync request waiting for first readiness.
  const cancellation = await page.evaluate(async () => {
    const e = rhythmTestEngine;
    e.update({ sync: true });
    await e.power(true);
    const ready = e.ready;
    let release;
    e.ready = new Promise((resolve) => (release = resolve));
    const pending = e.triggerSyncRhythm();
    e.stopRhythm();
    release();
    await pending;
    const stopped = !e.rhythmTimer;
    e.ready = new Promise((resolve) => (release = resolve));
    const stale = e.triggerSyncRhythm();
    await e.power(false);
    const power = e.power(true);
    release();
    await Promise.all([stale, power]);
    const cycled = !e.rhythmTimer;
    e.ready = ready;
    await e.power(false);
    return { stopped, cycled };
  });
  assert.deepEqual(cancellation, { stopped: true, cycled: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: drums and Sync are off by default; Start/Stop preserves volume and stays stopped across chord presses; explicit Sync quick taps and keyboard notes start continuous drums; Space stops all sound; release and pending loads cannot undo manual stop; Power stops audio.",
  );
  await browser.close();
})();
