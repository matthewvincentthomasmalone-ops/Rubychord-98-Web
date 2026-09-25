# Rubychord-98 Web

A standalone browser edition of Rubychord-98, designed as a playable electronic chord and strum instrument.

## Features

- 36 major, minor and seventh chord buttons
- Twelve-zone strumplate
- Eight rhythm patterns and auto-bass
- Web MIDI input and MIDI CC learn
- Web Serial control
- Computer-keyboard mapping compatible with Online Omnichord
- Original Web Audio synthesis with tone and preamp controls
- Responsive oxblood-and-gold interface

## Run locally

Web Audio, MIDI and Serial permissions work most reliably when the project is served over HTTP rather than opened as a `file://` URL.

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Controls

- Major chords: `Q` through `O`
- Minor chords: `A` through `L`
- Seventh chords: `Z` through `.`
- Strumplate: `1` through `=`
- Stop all sound: `Space`
- Knobs: drag vertically, Shift-drag for fine control, use the mouse wheel, or focus and use arrow keys

## Audio assets

The public project uses its own Web Audio synthesis engine. Third-party Omnichord sample recordings are not included.
