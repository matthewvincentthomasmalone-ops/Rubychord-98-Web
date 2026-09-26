#!/usr/bin/env python3
"""Prepare bit-exact lossless FLAC delivery files from the original local WAVs."""
import hashlib
import json
import subprocess
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def prepare(entry):
    original = ROOT / entry['source']
    destination = original.with_suffix('.flac')
    if not destination.exists() or destination.stat().st_mtime < original.stat().st_mtime:
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', str(original),
                        '-c:a', 'flac', '-compression_level', '8', '-threads', '1', str(destination)], check=True)
    decoded = subprocess.check_output(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(destination),
                                      '-f', 's24le', '-acodec', 'pcm_s24le', '-'])
    with wave.open(str(original)) as wav:
        pcm = wav.readframes(wav.getnframes())
    if pcm != decoded:
        raise ValueError(f'Lossless verification failed: {original.name}')
    entry.update(deliverySource=str(destination.relative_to(ROOT)),
                 deliverySha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
                 deliveryBytes=destination.stat().st_size, sourceBytes=original.stat().st_size,
                 pcmSha256=hashlib.sha256(pcm).hexdigest())
    return entry


def main():
    path = ROOT / 'sample-manifest.json'
    manifest = json.loads(path.read_text())
    with ThreadPoolExecutor(max_workers=4) as workers:
        manifest['samples'] = list(workers.map(prepare, manifest['samples']))
    path.write_text(json.dumps(manifest, indent=2) + '\n')
    original = sum(s['sourceBytes'] for s in manifest['samples'])
    compact = sum(s['deliveryBytes'] for s in manifest['samples'])
    print(f'Verified {len(manifest["samples"])} lossless recordings: {original/1e6:.1f} MB WAV → {compact/1e6:.1f} MB FLAC.')


if __name__ == '__main__':
    main()
