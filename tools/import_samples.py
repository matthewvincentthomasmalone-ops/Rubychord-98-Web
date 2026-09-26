#!/usr/bin/env python3
"""Import the user's local Omni-84 2.1.0 ZIP. No network access or normalization."""
import argparse, csv, hashlib, io, json, math, struct, wave, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
QUALITIES = ['major', 'minor', 'seventh', 'minor7', 'major7', 'diminished', 'augmented']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    entries = {}
    presets = ['Bass.dspreset', 'Chords (Looped).dspreset', 'Drums.dspreset', 'Keyboard.dspreset', 'SonicStrings.dspreset']
    with zipfile.ZipFile(args.archive) as archive:
        for preset in presets:
            for sample in ET.fromstring(archive.read(preset)).findall('.//sample'):
                attr = sample.attrib; path = attr['path']
                if path in entries: continue
                trigger = int(attr['rootNote'])
                role = path.split('/')[1].lower()
                group = ('strings' + path.split('/')[2][-1]) if role == 'sonicstrings' else role
                data = archive.read(path)
                with wave.open(io.BytesIO(data)) as wav:
                    rate, channels, frames, width = wav.getframerate(), wav.getnchannels(), wav.getnframes(), wav.getsampwidth()
                entry = dict(source='assets/audio/omni-84/'+path, filename=path, format=f'WAV PCM {width*8}', duration=round(frames/rate,6), sampleRate=rate, channels=channels, frames=frames, role=role, group=group, triggerMidi=trigger, rootMidi=trigger+12 if role not in ('chords','drums') else None, gain=1, tuningCents=0, sha256=hashlib.sha256(data).hexdigest())
                if role == 'chords': entry.update(rootPC=trigger%12, quality=QUALITIES[(trigger-36)//12], rootMidi=None)
                if role == 'drums': entry['drum'] = Path(path).name.split('_')[0].lower()
                if attr.get('loopEnabled') == '1':
                    entry.update(loopStart=int(attr['loopStart'])/rate, loopEnd=int(attr['loopEnd'])/rate, crossfade=min(int(attr.get('loopCrossfade','0'))/rate, .02), loopAssessment='Preset loop; runtime crossfade; listening verification pending')
                    assert 0 <= entry['loopStart'] < entry['loopEnd'] <= frames/rate
                else: entry['loopAssessment']='One-shot; not looped'
                destination=ROOT/entry['source']; destination.parent.mkdir(parents=True, exist_ok=True); destination.write_bytes(data)
                entries[path]=entry
        # Inventory the supplied IR too, but keep it out of the dry playback engine.
        path='IR/Space.wav'; data=archive.read(path)
        with wave.open(io.BytesIO(data)) as wav:
            ir=dict(filename=path, format=f'WAV PCM {wav.getsampwidth()*8}', duration=round(wav.getnframes()/wav.getframerate(),6),sampleRate=wav.getframerate(),channels=wav.getnchannels(),role='reverb impulse',loopAssessment='Not used')
    samples=sorted(entries.values(),key=lambda e:e['filename'])
    manifest=dict(library='Dehli Musikk Omni-84', version='2.1.0', archive=args.archive.name, samples=samples)
    (ROOT/'sample-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    fields=['filename','format','duration','sampleRate','channels','role','group','rootMidi','triggerMidi','rootPC','quality','drum','loopStart','loopEnd','crossfade','loopAssessment','gain','tuningCents','sha256']
    with (ROOT/'docs/sample-audit.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(samples+[ir])
    print(f'Imported {len(samples)} recordings; inventoried {len(samples)+1} WAVs. Original PCM preserved.')

if __name__=='__main__': main()
