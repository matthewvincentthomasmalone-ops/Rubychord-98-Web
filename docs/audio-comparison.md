# Audio character and reference comparison

Source used: local Dehli Musikk Omni-84 DecentSampler 2.1.0. The importer retains original PCM and source SHA-256. See sample-audit.csv for each of the 278 WAVs (277 musical recordings plus unused IR). Preset loop flags describe intended loops, not a claim of clean audible sustain for every recording.

Public-code reference: https://github.com/arcticmatt/online-omnichord/blob/master/src/App.js inspected 26 September 2026, without fetching audio. It loops complete chords and rhythms through Howler, creates per-strum Howls from chord-specific recordings, uses 10 ms chord fades and a 5 ms strum fade, and changes rhythm playback rate with tempo. Rubychord instead caches Web Audio buffers, uses its own local chromatic strings, uses 25 ms chord release and 2 ms source attack, and schedules drum hits at a fixed pitch. No Online Omnichord code or audio is incorporated.

| Characteristic | Implemented / evidence | Remaining comparison |
| --- | --- | --- |
| Attack | Original PCM transient, 2 ms gain ramp | No listening A/B against reference |
| Release / strum decay | Source decay up to 3 seconds; Sustain shortens tail | Physical sustain knob law and held-note behaviour unmeasured |
| Chord sustain | Exact recorded chord and supplied loop bounds, short crossfade | All loops need listening review |
| Chord vs string level | Separate buses and controls; source gains stay at 1 | Relative output not calibrated against hardware |
| Spectral balance / bass / brightness | No global EQ; source and native pitch preserved | No reference spectra captured |
| Noise floor | Recorded noise retained; unused IR excluded | No silent hardware capture for calibration |
| Saturation | Bypassed at master ≤75%; gentle tanh above; safety compressor | Not fitted to a hardware preamp |
| Speaker colour | No simulated speaker filtering | Hardware speaker response absent |
| Pitch / octaves | C chord-bank spectra, bass C, keyboard C and SonicStrings C/F# checked; preset triggers are one octave below pitched recordings | Per-note fine tuning left at zero to preserve source |
| Velocity | Browser gestures fixed; MIDI velocity scales gain | No velocity-layer recordings |
| Polyphony | Independent buffer sources; no hard strum voice stealing | Mobile memory/CPU and audio-device latency unmeasured |
| Loop transition | C-major numerical boundary equals source adjacent-sample delta; 15-second offline render finite | Numerical continuity is not listening confirmation |

Example spectral peaks: C major includes ~131, 196 and 330 Hz. The nominal preset SonicStrings rootNote 60 recording has fundamental ~523 Hz (sounding MIDI 72). The lowest nominal rootNote 42 string is ~185 Hz (sounding MIDI 54). Bass preset root 24 is approximately C2 (~65 Hz), keyboard root 36 approximately C3 (~131 Hz). Those measurements informed the manifest; filenames were not blindly used as pitch labels.

Missing recordings: all OM-108 digital main/sub voice pairs, OM-108 complete sus4/add9 chord captures, continuous held-string captures and calibrated control-level variations. Exact hardware rhythm sequences are also needed for timing fidelity. No subjective sonic authenticity claim is made.
