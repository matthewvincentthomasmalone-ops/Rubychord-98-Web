// No runtime dependencies: node tests/controls.test.mjs
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const source = await fs.readFile(
  new URL("../omnichord-controls.js", import.meta.url),
  "utf8",
);
const { resolveChord, chordButtons, strumNotes, INTERVALS } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
assert.equal(chordButtons().length, 38);
const cases = {
  major: ["major"],
  minor: ["minor"],
  seventh: ["seventh"],
  major7: ["major", "seventh"],
  minor7: ["minor", "seventh"],
  diminished: ["major", "minor"],
  augmented: ["major", "minor", "seventh"],
};
for (let root = 0; root < 12; root++) {
  for (const [quality, rows] of Object.entries(cases))
    assert.deepEqual(resolveChord(rows.map((quality) => ({ root, quality }))), {
      root,
      quality,
    });
  for (const [quality, row] of [
    ["sus4", "seventh"],
    ["add9", "minor"],
  ])
    assert.deepEqual(
      resolveChord([
        { root, quality: "major" },
        { root: (root + 5) % 12, quality: row },
      ]),
      { root, quality },
    );
  for (const quality of Object.keys(INTERVALS)) {
    const notes = strumNotes(root, quality);
    assert.equal(notes.length, 13);
    assert.equal(notes[12] - notes[0], 48);
    assert.ok(notes.every((n) => n >= 54 && n <= 113));
    assert.ok(
      notes.every((n) => INTERVALS[quality].includes((n - root + 120) % 12)),
    );
  }
}
assert.deepEqual(
  strumNotes(0, "major"),
  [60, 64, 55, 72, 76, 67, 84, 88, 79, 96, 100, 91, 108],
);
assert.deepEqual(
  strumNotes(7, "major"),
  [55, 59, 62, 67, 71, 74, 79, 83, 86, 91, 95, 98, 103],
);
console.log(
  "PASS: all 108 chord combinations, 38 buttons, source-covered 13-zone voicings and manual C/G examples",
);
