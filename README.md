# Rubychord-98 Web

An independent, non-commercial browser instrument with an oxblood body and an OM-108-inspired physical layout. Uses the user's local **Dehli Musikk Omni-84 2.1.0** recordings. It is not affiliated with Suzuki and does not claim a verified sonic match to an OM-108.

## Run

```sh
python3 -m http.server 4173
```

Open http://localhost:4173 and press **Power**. Wait for “Omni-84 ready to play”. Startup now loads the 34 essential recordings (about 6.7 MB) first; the rest load in the background. Chord changes prioritize their exact recordings while the remaining bank is loading. No build step, framework or runtime package install is required.

## Local sample library

The audit found `~/Downloads/Omni-84-DecentSampler-2.1.0.zip` and another extraction in `../OXBLOOD-108/local-samples/dehli-omni-84`. This project imports from the ZIP. Nothing was downloaded from Online Omnichord's audio directories.

On another checkout, import your own local copy:

```sh
python3 tools/import_samples.py ~/Downloads/Omni-84-DecentSampler-2.1.0.zip
python3 tools/prepare_web_audio.py
```

Recordings live in `assets/audio/omni-84/Samples/`, preserving the library's Bass, Chords, Drums, Keyboard and SonicStrings/Voice1 and Voice2 names. These local audio files are **gitignored**. The deterministic `sample-manifest.json` and `docs/sample-audit.csv` contain the source filenames, roles, PCM details, durations, pitch/trigger mappings, loop points, gains, tuning and hashes. Raw recordings are unchanged. The ZIP's `IR/Space.wav` is inventoried but not imported into the dry engine.

| Role         | Recordings | Playback                                                     |
| ------------ | ---------: | ------------------------------------------------------------ |
| Chords       |         84 | Native-pitch complete chords; seven qualities × twelve roots |
| SonicStrings |        120 | Two chromatic banks, 60 notes each; separate main/sub buses  |
| Bass         |         19 | Native-pitch automatic accompaniment                         |
| Keyboard     |         32 | Melody mode and constructed sus4/add9 chords                 |
| Drums        |         22 | Recorded hits; ten programmed rhythm patterns                |

All 277 musical recordings are mono, 48 kHz, 24-bit PCM WAV. They occupy about 231 MiB on disk; decoded browser buffers require roughly 308 MiB before browser overhead. Lossless FLAC delivery files reduce the full transfer from 241.4 MB to 135.4 MB without changing a single PCM sample. `prepare_web_audio.py` requires FFmpeg and verifies every decoded FLAC against its original WAV. Originals remain available for browsers that cannot decode FLAC. Startup loads 34 recordings (~6.7 MB) and enables playback; the remaining recordings are cached in the background. Each new chord prioritizes its exact chord/string recordings. The loader deduplicates concurrent requests, and decoded buffers persist across Power cycles within the open page. Missing files are reported and only the affected sounds use the isolated temporary synth fallback.

### Pitch and loops

Do not interpret the preset `rootNote` as the recording's sounding MIDI pitch. Bass, keyboard and SonicStrings recordings sound one octave above their trigger numbers. The manifest records `triggerMidi` separately from `rootMidi`; the C reference spectra and the lowest string sample were checked. Chord preset note numbers encode quality/root selection, not transposition. Chord banks 1–7 are major, minor, seventh, minor7, major7, diminished and augmented.

Primary chord playback uses one recorded chord at rate 1. Sus4/add9 use three keyboard multisamples. The manual's reduced triads are used for the strum voicing. The thirteen strum regions preserve its F#–F octave grouping and inversions, spanning four octaves. Available notes use exact samples; external MIDI pitches use the nearest source within an octave, then explicit fallback beyond that range.

Preset chord and keyboard loop points are converted from source frames to seconds. Decoded buffers receive a short tail-to-pre-loop crossfade; raw files are untouched. Chord changes release over 25 ms. Transients retain their source dynamics, with only a 2 ms anti-click attack. Sustain shortens the one-shot tail; maximum preserves the recorded three-second strings. No global low-pass or heavy waveshaping remains. Buses → section gains → master → nearly transparent master-linked saturation above 75% → safety compression → output. No reverb IR, automatic normalization, tuning correction or speculative speaker EQ is applied.

## Playing

- **Power:** load/start audio, or silence and suspend it.
- **Voice/Pattern:** five physical selectors plus a yellow upper/lower bank button, matching the hardware's ten selections.
- **Chord panel:** 38 staggered buttons. Major/minor/seventh combinations select all 108 root/quality combinations. Use multiple fingers, simultaneous computer keys, or Shift-click to latch mouse buttons.
- **M7:** Major + 7th; **m7:** Minor + 7th; **dim:** Major + Minor; **aug:** all three, on the same root.
- **sus4:** Major + fourth-root 7th (immediately left); **add9:** Major + fourth-root Minor.
- **Chord Hold:** retain the selected chord after release. **Manual/Auto:** sustained chord versus sequenced chord and bass.
- **Rhythm Start/Stop and Sync Start:** drums and Sync Start are off by default. The blue Rhythm button starts drums immediately. While drums are playing, press it again to stop them without changing Rhythm Volume. Stopped drums stay off while you play. Click the Sync Start control to arm drums for the next chord/keyboard-note press; click it again to disarm. Releasing a note leaves drums playing. Pattern/keyboard mode changes retain the beat. Power Off stops the instrument.
- **Strumplate:** tap or sweep vertically; higher zones are at the top. Fast pointer moves trigger every crossed region. Pointer capture and per-pointer tracking support touch.
- **Space:** fade out all voices and stop drums, including pending note/rhythm requests.
- **Keyboard:** chord buttons play individual sampled keyboard notes and the strumplate triggers drums. This is a simplified keyboard mode, not the complete hardware overlay map.
- **Knobs:** drag vertically, Shift-drag for finer adjustment, mouse wheel, arrows, Page Up/Down, Home/End. Accessible values exist without faceplate numeric readouts.

Computer keys: Q–O major, A–L minor, Z–. seventh, ordered E♭ B♭ F C G D A E B. P gives F♯ major, ; (or :) gives F♯ minor, and / (or ?) gives F♯ seventh. 1–= gives the first twelve strum regions, + the thirteenth. Keyboard and connection instructions are in the external settings drawer.

The bottom **Keyboard** button opens a transparent, playable keyboard guide. Physical computer keys and pointer/touch presses highlight its burgundy outlined keys with a pink radial fill (24% at the centre, 42% at the edge). The opened guide reserves space below the instrument; narrow screens can scroll the keyboard horizontally. The extra striped pad and Instant Off page control have been removed.

In **Fit instrument** mode, the keyboard can overlap the instrument. A light pink underlay (78% opacity) keeps its burgundy outlines and labels readable, with darker pink key highlights (28% at the centre, 46% at the edge). Returning to Playing size restores the transparent keyboard.

The bottom-left power instruction is a non-interactive cream-on-oxblood plaque. It disappears when the instrument is powered on. This corner then displays only the chord or keyboard notes being pressed, including combined and held chords. Releasing an unheld chord clears it. Loading details stay in Settings & playing guide; rhythm, voice and power status messages do not appear on the page.

The instrument scales as one surface. Desktop scaling accounts for viewport height. Narrow screens retain a horizontally scrollable playing size; “Fit instrument” offers an overview. Landscape provides more playable room.

## MIDI and Serial

Open **Settings & playing guide** outside the faceplate. MIDI input, persistent CC learn, Serial, connection status and keyboard instructions are here. Double-click a knob, chord button or strum region, then send a CC to assign it. MIDI notes play local keyboard multisamples. Clear assignments from the drawer. MIDI output is not implemented (the previous web version only had input).

Serial uses 115200 baud, newline-delimited commands:

```text
CHORD C MAJOR
CHORD F# MINOR
CHORD C M7
CHORD D MIN7
STRUM 5
NOTE 60 100
NOTEOFF 60
CC 7 100
RHYTHM START
RHYTHM STOP
OFF
```

`RHYTHM STOP` stops drums without changing their volume. `OFF` silences all audio.

Chord quality tokens also include `7`, `AUG`, `DIM`, `SUS4`, `ADD9`. Invalid note/strum numbers are ignored.

Current Chromium is the tested target. Web Audio is expected in current Firefox and Safari but has not been tested here. MIDI/Serial availability is feature-detected; device permissions require localhost or HTTPS. No physical MIDI or Serial device was available for testing.

## Known differences / missing assets

- The supplied library captures an OM-84, not all OM-108 voices. Eight digital voice selections are explicit synthesized approximations. Omni1 main uses the dry SonicStrings bank; its sub uses the tremolo bank. Omni2's string subvoice uses a keyboard-bank approximation. Exact digital main/sub recordings are still required.
- Sus4/add9 complete chord recordings are absent; local keyboard multisamples construct them. All ten rhythm timings are programmed approximations using authentic hits, not measured OM-108 patterns.
- Continuous finger-held strum sustain, repeated-tap arpeggio cycling, exact keyboard/drum overlay and mono last-note priority are not emulated. Tuning, transpose, octave-shift hardware shortcuts and MIDI OUT remain unimplemented.
- Silhouette/control placement was compared visually against the official manual diagram, not a supplied photograph (none was attached). Lettering, materials and some legends remain approximations.
- No listening A/B or hardware latency measurement was performed. Browser playback, mapping and numerical loop checks are not proof of sonic authenticity.

See [implementation note](docs/implementation-note.md), [audio/reference comparison](docs/audio-comparison.md), and [verification](docs/verification.md).

## Checks

```sh
node tests/controls.test.mjs
node tests/connections.test.mjs
```

Optional browser regression checks require Playwright (tested with 1.51.1), Chrome and the local server:

```sh
npm install --prefix /tmp/rubychord-tests playwright@1.51.1
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/browser.cjs
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/audio.cjs
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/loading.cjs
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/presentation.cjs
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/rhythm.cjs
NODE_PATH=/tmp/rubychord-tests/node_modules node tests/keyboard-view.cjs
```

Set `CHROME_PATH` if Chrome is not at `/usr/bin/google-chrome`. Screenshots are written to ignored `test-results/`.

## References

Panel, chord combinations, octave grouping and voice assignments: [Suzuki's official OM-108 manual](https://www.suzuki-music.co.jp/manual/om-108_en/), pages 3, 14–18, 31, 49–50. Architecture-only comparison: [Online Omnichord App.js](https://github.com/arcticmatt/online-omnichord/blob/master/src/App.js). Its audio was not fetched or incorporated.

## Publishing rubysite.us/rubychord

The live URL is served from the `rubychord/` folder on `main` in
`matthewvincentthomasmalone-ops/matthewvincentthomasmalone-ops.github.io`.
The Rubychord source repository does not itself have Pages enabled.

After committing the source, prepare the website checkout using:

```sh
python3 tools/publish_site.py ../rubysite-publish
```

This validates all 277 original sample hashes and copies the runtime and audio
into the website's `rubychord/` folder, with a `deployment.json` identifying the
source commit. Commit and push that website folder to publish through GitHub
Pages. The source repository excludes audio; the website deployment includes
it so published playback uses the same recordings as local playback. Source
pushes alone do not automatically update the website. This packaging step
preserves other website pages.

The September 26 refinement restores the original washed-out Los Angeles image
and pink overlay. Cream faceplate outlines use separate SVG paths. Panels and
the speaker remain inside the inset body border with measurable gaps between
strokes; chord guide lines were removed to avoid intersections. Pointer clicks
on Power do not show a focus outline; keyboard focus retains an inset indicator.
