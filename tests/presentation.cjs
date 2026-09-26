const { chromium } = require("playwright");
const assert = require("node:assert/strict");
require("node:fs").mkdirSync("test-results", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4173/");
  const geometry = await page.evaluate(() => {
    const svg = document.querySelector(".body-art"),
      path = document.querySelector("#outline"),
      border = document.querySelector("#bodyBorder"),
      inverse = border.transform.baseVal.consolidate().matrix.inverse();
    const screenInverse = svg.getScreenCTM().inverse();
    const length = path.getTotalLength(),
      bodyPoints = [];
    for (let l = 0; l < length; l += 2)
      bodyPoints.push(
        path.getPointAtLength(l).matrixTransform(inverse.inverse()),
      );
    const samples = [
      ...document.querySelectorAll(".panel-outline"),
      document.querySelector(".speaker>path"),
    ].map((el) => {
      let points = [];
      for (let l = 0; l < el.getTotalLength(); l += 2)
        points.push(
          el
            .getPointAtLength(l)
            .matrixTransform(el.getScreenCTM())
            .matrixTransform(screenInverse),
        );
      return { el, points };
    });
    return samples.map(({ el, points }, i) => ({
      i,
      tag: el.tagName,
      outside: points.filter(
        (p) => !path.isPointInFill(p.matrixTransform(inverse)),
      ).length,
      minBodyGap: Math.min(
        ...points.map((p) =>
          Math.min(...bodyPoints.map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
        ),
      ),
      nearestPanelGap: Math.min(
        ...samples
          .filter((_, j) => j !== i)
          .map((s) =>
            Math.min(
              ...points.map((p) =>
                Math.min(
                  ...s.points.map((q) => Math.hypot(p.x - q.x, p.y - q.y)),
                ),
              ),
            ),
          ),
      ),
    }));
  });
  for (const outline of geometry) {
    assert.equal(outline.outside, 0);
    assert.ok(outline.minBodyGap >= 5);
    assert.ok(outline.nearestPanelGap >= 5);
  }
  await page.locator("#power").click();
  assert.equal(
    await page
      .locator("#power")
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  await page.waitForFunction(
    () => document.querySelector("#sampleStatus").textContent.includes("ready"),
    null,
    { timeout: 60000 },
  );
  await page.screenshot({ path: "test-results/refined.png", fullPage: false });
  console.log(
    "PASS cream outlines stay inside the body with separate strokes; no power click outline",
    geometry,
  );
  await browser.close();
})();
