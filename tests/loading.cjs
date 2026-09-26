const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  let release;
  const backgroundGate = new Promise((resolve) => (release = resolve));
  await page.route("**/Samples/Chords/Chords_1D.flac", async (route) => {
    await backgroundGate;
    await route.continue();
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4173/");
  // The production app begins its silent warm-up without a Power click.
  await page.waitForFunction(
    () => document.querySelector("#sampleStatus").textContent.includes("ready"),
    null,
    { timeout: 60000 },
  );
  assert.equal(
    await page.locator("#power").getAttribute("aria-pressed"),
    "false",
  );
  const result = await page.evaluate(async () => {
    const { SampleEngine } = await import("./audio-engine.js");
    const engine = new SampleEngine();
    window.loadingTestEngine = engine;
    const preloadStart = performance.now();
    await engine.preload();
    const preloadMilliseconds = performance.now() - preloadStart;
    const poweredDuringPreload = engine.powered;
    const contextBeforePower = engine.ctx.state;
    const start = performance.now();
    await engine.power(true);
    const powerMilliseconds = performance.now() - start;
    const loaded = engine.samples.filter((s) => engine.buffers.has(s.source));
    const firstBytes = loaded.reduce((total, s) => total + s.deliveryBytes, 0);
    let backgroundFinished = false;
    engine.loadingAll.then(() => (backgroundFinished = true));
    engine.update({ sync: false });
    await engine.selectChord({ root: 0, quality: "major" });
    await engine.strum(0);
    const allRecorded = [...engine.voices].every(
      (v) => v.sources[0] instanceof AudioBufferSourceNode,
    );
    engine.stopAll();
    await new Promise((r) => setTimeout(r, 60));
    return {
      startupCount: loaded.length,
      totalCount: engine.samples.length,
      firstBytes,
      preloadMilliseconds,
      powerMilliseconds,
      poweredDuringPreload,
      contextBeforePower,
      allRecorded,
      backgroundFinished,
      afterStop: engine.voices.size,
    };
  });
  assert.ok(result.startupCount < result.totalCount);
  assert.ok(result.firstBytes < 12e6);
  assert.ok(result.allRecorded);
  assert.equal(result.poweredDuringPreload, false);
  assert.equal(result.contextBeforePower, "suspended");
  assert.ok(result.powerMilliseconds < 250);
  assert.equal(result.backgroundFinished, false);
  assert.equal(result.afterStop, 0);
  release();
  await page.evaluate(async () => {
    await window.loadingTestEngine.loadingAll;
    await window.loadingTestEngine.ctx.close();
  });
  console.log("PASS staged startup", JSON.stringify(result));
  await browser.close();
})();
