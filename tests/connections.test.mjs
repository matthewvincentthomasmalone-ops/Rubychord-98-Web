import fs from "node:fs/promises";
import assert from "node:assert/strict";
const source = await fs.readFile(
  new URL("../connections.js", import.meta.url),
  "utf8",
);
const { connectDevices } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const stored = new Map();
globalThis.localStorage = {
  getItem: (k) => stored.get(k),
  setItem: (k, v) => stored.set(k, v),
};
const input = {};
const calls = [];
let read = 0;
const reader = {
  async read() {
    return read++
      ? { done: true }
      : {
          value: new TextEncoder().encode(
            "CHORD C MAJOR\nSTRUM 13\nSTRUM nope\nNOTE 60 100\nNOTEOFF 60\nOFF\n",
          ),
          done: false,
        };
  },
  releaseLock() {},
};
globalThis.navigator = {
  requestMIDIAccess: async () => ({ inputs: new Map([["keyboard", input]]) }),
  serial: {
    requestPort: async () => ({
      open: async () => {},
      close: async () => {},
      readable: { getReader: () => reader },
    }),
  },
};
const devices = connectDevices({
  engine: {
    midiNoteOn: (...x) => calls.push(["on", ...x]),
    midiNoteOff: (...x) => calls.push(["off", ...x]),
    strum: (i) => calls.push(["strum", i]),
    stopAll: () => calls.push(["stop"]),
  },
  selectChord: (c) => calls.push(["chord", c]),
  applyControl: (...x) => calls.push(["cc", ...x]),
  status: () => {},
  learnStatus: () => {},
});
await devices.midi();
input.onmidimessage({ data: [0x90, 60, 127] });
input.onmidimessage({ data: [0x90, 60, 0] });
devices.learn("master");
input.onmidimessage({ data: [0xb0, 7, 100] });
input.onmidimessage({ data: [0xb0, 7, 127] });
assert.deepEqual(calls, [
  ["on", 60, 1],
  ["off", 60],
  ["cc", "master", 1],
]);
assert.equal(JSON.parse(stored.get("rubychord-midi-map"))["7"], "master");
calls.length = 0;
await devices.serial();
assert.deepEqual(calls, [
  ["chord", { root: 0, quality: "major" }],
  ["strum", 12],
  ["on", 60, 100 / 127],
  ["off", 60],
  ["stop"],
]);
devices.clear();
assert.deepEqual(JSON.parse(stored.get("rubychord-midi-map")), {});
console.log(
  "PASS: simulated MIDI note/zero-velocity release, persistent CC learn, Serial parsing and invalid strum rejection",
);
