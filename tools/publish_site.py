#!/usr/bin/env python3
"""Prepare the rubychord folder in a local website checkout; does not push."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]
RUNTIME = ['index.html', 'styles.css', 'app.js', 'audio-engine.js',
           'connections.js', 'fallback-synth.js', 'omnichord-controls.js',
           'sample-manifest.json', 'assets/la.webp']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('website_checkout', type=Path)
    args = parser.parse_args()
    site = args.website_checkout.resolve()
    if not (site / '.git').exists() or (site / 'CNAME').read_text().strip() != 'rubysite.us':
        parser.error('Expected the rubysite.us Git website checkout')
    manifest = json.loads((SOURCE / 'sample-manifest.json').read_text())
    files = RUNTIME + [entry['source'] for entry in manifest['samples']] + [entry['deliverySource'] for entry in manifest['samples'] if entry.get('deliverySource')]
    for entry in manifest['samples']:
        path = SOURCE / entry['source']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            parser.error(f'Missing or changed local recording: {entry["source"]}')
    for entry in manifest['samples']:
        if entry.get('deliverySource'):
            path = SOURCE / entry['deliverySource']
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != entry['deliverySha256']:
                parser.error(f'Missing or changed compact recording: {entry["deliverySource"]}')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=SOURCE, text=True).strip()
    target = site / 'rubychord'
    for name in files:
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SOURCE / name, destination)
    (target / 'deployment.json').write_text(json.dumps({
        'sourceRepository': 'matthewvincentthomasmalone-ops/Rubychord-98-Web',
        'sourceCommit': revision,
        'library': manifest['library'], 'libraryVersion': manifest['version'],
        'sampleCount': len(manifest['samples'])
    }, indent=2) + '\n')
    print(f'Prepared {len(files)} files in {target}; source revision {revision}')
    print('Review the website Git diff, then commit and push its main branch to publish.')


if __name__ == '__main__':
    main()
