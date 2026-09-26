const { chromium } = require("playwright");
require("node:fs").mkdirSync("test-results", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:4173");
  const result = await page.evaluate(async () => {
    const { SampleEngine } = await import("./audio-engine.js");
    const e = new SampleEngine();
    await e.power(true);
    let counts = { startupLoaded: e.buffers.size };
    await e.loadingAll;
    counts.loaded = e.buffers.size;
    e.update({ sync: false });
    await e.selectChord({ root: 0, quality: "major" });
    counts.chord = e.chordVoices.length;
    counts.nativeChordRate = e.chordVoices[0].sources[0].playbackRate.value;
    counts.loop = e.chordVoices[0].sources[0].loop;
    await Promise.all(Array.from({ length: 13 }, (_, i) => e.strum(i)));
    counts.glissando = e.voices.size;
    e.stopAll();
    await new Promise((r) => setTimeout(r, 100));
    counts.afterStop = e.voices.size;
    e.selectChord({ root: 0, quality: "major" });
    e.stopAll();
    await new Promise((r) => setTimeout(r, 50));
    counts.cancelledChord = e.voices.size;
    e.midiNoteOn(60);
    e.midiNoteOff(60);
    await new Promise((r) => setTimeout(r, 50));
    counts.cancelledMidi = e.voices.size;
    await e.selectChord({ root: 0, quality: "sus4" });
    counts.sus4 = e.chordVoices.length;
    counts.sus4AllBuffers = e.chordVoices.every(
      (v) => v.sources[0] instanceof AudioBufferSourceNode,
    );
    e.stopAll();
    await new Promise((r) => setTimeout(r, 70));
    e.update({ auto: true, sync: true });
    await e.selectChord({ root: 7, quality: "minor7" });
    await new Promise((r) => setTimeout(r, 400));
    counts.autoRhythm = !!e.rhythmTimer;
    e.stopAll();
    await new Promise((r) => setTimeout(r, 100));
    counts.afterRhythmStop = e.voices.size;
    e.update({ auto: true, sync: false, hold: false });
    await e.selectChord({ root: 0, quality: "major" });
    e.startRhythm();
    e.releaseChord();
    await new Promise((r) => setTimeout(r, 700));
    counts.releasedAutoChordVoices = [...e.voices].filter(
      (v) => v.role === "chord",
    ).length;
    counts.continuousRhythmRetained = !!e.rhythmTimer;
    e.stopAll();

    const entry = e.samples.find(
      (s) => s.quality === "major" && s.rootPC === 0,
    );
    const b = e.buffers.get(entry.source),
      sr = b.sampleRate,
      d = b.getChannelData(0),
      st = Math.round(entry.loopStart * sr),
      end = Math.round(entry.loopEnd * sr);
    counts.loopBoundaryDelta = Math.abs(d[end - 1] - d[st]);
    counts.originalAdjacentDelta = Math.abs(d[st - 1] - d[st]);
    const offline = new OfflineAudioContext(1, 48000 * 15, 48000);
    const source = offline.createBufferSource();
    source.buffer = b;
    source.loop = true;
    source.loopStart = entry.loopStart;
    source.loopEnd = entry.loopEnd;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    const out = rendered.getChannelData(0);
    counts.renderFinite = out.every(Number.isFinite);
    counts.renderPeak = out.reduce((peak, x) => Math.max(peak, Math.abs(x)), 0);
    await e.power(false);
    counts.powerOff = e.ctx.state;
    await e.ctx.close();
    return counts;
  });
  console.log(JSON.stringify(result, null, 2));
  if (
    result.loaded !== 277 ||
    result.chord !== 1 ||
    result.nativeChordRate !== 1 ||
    !result.loop ||
    result.glissando < 27 ||
    result.afterStop ||
    result.cancelledChord ||
    result.cancelledMidi ||
    result.afterRhythmStop ||
    result.releasedAutoChordVoices ||
    !result.continuousRhythmRetained ||
    !result.sus4AllBuffers ||
    !result.renderFinite
  )
    throw Error("Audio regression");
  await browser.close();
})();
