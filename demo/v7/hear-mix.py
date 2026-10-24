# Mixes the rendered voices (media/checks/voices/<id>.wav) into one track at the given cues: each phrase
# runs from its cue until the next one starts, with a 80 ms fade. python3 hear-mix.py out.wav seconds cues_json
import sys, json, wave, struct, os
out, secs, cues = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
SR = 44100
VOICES = os.path.join(os.path.dirname(__file__), '..', '..', 'media', 'checks', 'voices')
n = int(secs * SR)
mix = [0.0] * (n * 2)
for k, (vid, at) in enumerate(cues):
    w = wave.open(os.path.join(VOICES, vid + '.wav')); m = w.getnframes()
    pcm = struct.unpack('<%dh' % (m * 2), w.readframes(m))
    start = int(max(at, 0) * SR)
    stop = int(cues[k + 1][1] * SR) if k + 1 < len(cues) else n
    fade = int(0.08 * SR)
    for i in range(min(m, stop + fade - start, n - start)):
        g = 1.0 if start + i < stop else max(0.0, 1 - (start + i - stop) / fade)
        j = (start + i) * 2
        mix[j] += pcm[i * 2] / 32768 * g; mix[j + 1] += pcm[i * 2 + 1] / 32768 * g
o = wave.open(out, 'wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR)
o.writeframes(struct.pack('<%dh' % len(mix), *[int(max(-1, min(1, v)) * 32767) for v in mix])); o.close()
print('mixed', len(cues), 'phrases into', out)
