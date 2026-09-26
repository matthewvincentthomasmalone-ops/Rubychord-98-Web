# Audit and implementation note — 26 September 2026

Before changes: inspected all five repository files, the clean Git working tree, hidden/ignored paths, Downloads and local Omni-named assets. No repository audio or applicable AGENTS.md existed. Found Downloads/Omni-84-DecentSampler-2.1.0.zip and a duplicate extraction in ../OXBLOOD-108/local-samples/dehli-omni-84. The ZIP is the import source; no Online Omnichord audio is used.

Plan: replace the oscillator-first engine with cached AudioBuffers from this local library; generate a deterministic manifest and complete CSV audit; use preset loop metadata and a short loop crossfade. Keep local recordings gitignored and provide a reproducible importer. Rebuild the face as a single scaled OM-108 arrangement using the official owner manual pp. 3, 14–18, 49–50. Preserve MIDI input/learn and Serial in an external drawer.

Library: 277 musical WAV recordings plus one reverb impulse. Seven chord banks map to major, minor, seventh, minor7, major7, diminished, augmented (FFT checked on C examples). Filename octave/preset trigger numbers are NOT sounding MIDI pitches: bass, keyboard and both SonicStrings banks sound an octave above preset rootNote. Preserve native pitch by recording both fields. No blanket normalization, tuning correction or speaker EQ.

Missing: OM-108 digital voice/subvoice recordings, sus4/add9 complete chords, exact OM-108 rhythm sequences and continuous-string sustain captures. Construct sus4/add9 from local keyboard multisamples; identify digital voices as fallback approximations. The library has drum hits, not rhythm loops. Patterns will sequence those hits, with timing documented as approximations. Hardware comparison by ear and connected MIDI/Serial testing remain separate from browser verification.

Reference: https://www.suzuki-music.co.jp/manual/om-108_en/ and official OM-108 English owner manual. No user reference image was attached with this brief, so the official panel diagram is the visual reference.
