#!/usr/bin/env python3
"""Every hosted file answers 200, at the expected byte count, with CORS open. Run after a new tag on aura-assets
(jsDelivr can take a minute to pick one up).  python3 tools/verify_cdn.py"""
import json, pathlib, subprocess, sys, time
d = json.loads((pathlib.Path(__file__).parent.parent / 'standalone/hosted.json').read_text())
def check(f):
    r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-D', '-', '-w', '%{http_code} %{size_download}', d['base'] + f['path']], capture_output=True, text=True).stdout
    code, size = r.strip().splitlines()[-1].split()
    cors = 'access-control-allow-origin: *' in r.lower()
    return code == '200' and int(size) == f['bytes'] and cors, code, size, cors
left = d['files']
for attempt in range(12):
    bad = [f for f in left if not check(f)[0]]
    print(f'try {attempt + 1}: {len(left) - len(bad)} of {len(left)} ok', flush=True)
    left = bad
    if not left:
        break
    time.sleep(10)
for f in left:
    print('FAILED', f['path'], f['bytes'], check(f)[1:])
sys.exit(1 if left else 0)
