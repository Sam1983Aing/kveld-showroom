# Levels of a captured or rendered WAV, per section when a marks file says which section was when.
#   python3 tools/sound_stats.py file.wav [marks.json]
import sys, json, wave, array, math
w = wave.open(sys.argv[1]); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
a = array.array('h'); a.frombytes(w.readframes(n))
import subprocess, re
def lufs(t0=None, dur=None):
    cmd = ['ffmpeg', '-hide_banner', '-nostats']
    if t0 is not None: cmd += ['-ss', f'{t0:.2f}', '-t', f'{dur:.2f}']
    cmd += ['-i', sys.argv[1], '-af', 'ebur128', '-f', 'null', '-']
    out = subprocess.run(cmd, capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', out)
    return float(m[-1]) if m else None
def db(x): return 20 * math.log10(x) if x > 1e-7 else -140.0
def stats(i0, i1):
    peak = 0; e = 0; m = 0
    for i in range(i0 * ch, i1 * ch, ch):
        v = max(abs(a[i]), abs(a[i + 1])) / 32768 if ch == 2 else abs(a[i]) / 32768
        peak = max(peak, v); e += v * v; m += 1
    return db(peak), db(math.sqrt(e / max(m, 1)))
p, r = stats(0, n)
print(f'whole {n/sr:6.1f} s  peak {p:6.1f} dB  rms {r:6.1f} dB  {lufs()} LUFS  clipped {sum(1 for x in a if abs(x) >= 32767)}')
if len(sys.argv) > 2:
    M = json.load(open(sys.argv[2])); at = M['at']; spans = []
    for t, s, *_ in M['marks']:
        if spans and spans[-1][0] == s: spans[-1][2] = t
        else: spans.append([s, t, t])
    for s, a0, a1 in spans:
        i0, i1 = int((a0 - at) * sr), min(int((a1 - at) * sr), n)
        if i1 - i0 < sr * 0.4: continue
        p, r = stats(i0, i1)
        print(f'  {s:9} {a1 - a0:5.1f} s  peak {p:6.1f} dB  rms {r:6.1f} dB  {lufs(a0 - at, a1 - a0)} LUFS')
