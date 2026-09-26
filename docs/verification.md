# Verification — 26 September 2026

## Automated checks actually run

- `node tests/controls.test.mjs`: all 108 root/quality combinations; exactly 38 buttons; every 13-region strum mapping within local multisample coverage; C and G arrangements from Suzuki manual p49.
- `node tests/connections.test.mjs`: simulated MIDI note-on/zero-velocity note-off; CC learn persistence; serial chord, strum, note/off and all-off commands; invalid strum ignored. No physical devices were connected.
- Headless Google Chrome with Playwright 1.51.1: local HTTP startup; 277 successful WAV decodes; 38 chord buttons; keyboard CM7 combination; fast full-height mouse sweep; Hold/Auto/Keyboard switches; Instant Off; master arrow-key adjustment; no JS/console errors.
- Audio engine browser test: one native-rate sampled chord with looping; 27 simultaneous voices after chord plus thirteen main/sub string triggers; zero remaining voices after Instant Off, cancelled pending chord, cancelled pending MIDI note, and rhythm stop.
- Auto accompaniment release was additionally checked in continuous Start mode: chord/bass voices stop on release while the drum scheduler continues.
- Sus4 construction uses three AudioBuffer sources. Auto mode starts the rhythm scheduler; Power Off suspends AudioContext.
- C-major loop boundary absolute delta: 0.0025951862, equal to the original adjacent-sample delta at the loop start after crossfade. A 15-second OfflineAudioContext render remained finite, peak 0.5259659290.
- Missing-manifest simulation reports the temporary synthesized fallback and clears voices on stop.
- Python importer syntax and Git whitespace checks passed.

## Visual review actually performed

Screenshots at 1440×900, 1920×1080, 2560×1440, 1024×768 tablet landscape and 390×844 portrait (scrollable playing size and fit overview). Compared against the official owner manual panel diagram. Corrected overlapping chord labels, grey/cream key positions and viewport-height scaling after the first screenshot pass. Screenshots are generated in ignored `test-results/` by the browser check.

The recognizable arrangement is reproduced: rounded left body, tapered speaker end, logo below the chord panel, upper-left banked selectors, cream knobs above/right, 38 staggered chord buttons, realtime controls at lower-right, tall gold plate, separate Instant Off touch pad, perforated ruby speaker.

## Not verified / remaining limitations

No subjective listening comparison against Online Omnichord or a physical OM-108. No claim of audible click-free loops across the entire library, calibrated levels, exact noise floor, speaker response, hardware-like saturation or measured end-to-end latency. Only representative pitches were measured spectrally; mapping of the rest follows the source preset convention. Browser automation does not prove natural multitouch feel on a device. Firefox/Safari and actual MIDI/Serial hardware were not exercised. Exact digital voices, accompaniment timing and full hardware keyboard/special-function logic require further source recordings and hardware comparison; see README.
