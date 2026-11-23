"""Puts ONE continuous voice recording onto a silent tutorial video.

The owner reads the script (tutorials/recorded/<video>/<lang>/SENTENCES.md) in one take, saying the
line's NUMBER before each sentence ("one … sentence … two … sentence …"). This script finds the
pauses, drops the spoken numbers (every other piece of sound), and places sentence N at the moment
the video needs it (from the plain recording's timing file), cleaned up and at -16 LUFS.

  TUTORIAL_PLAIN=1 npm run tutorials -- history      # → output/<video>.<lang>.plain.webm + .timing.json
  python3 -I tutorials/voiceover-take.py history-all-types ka
  → public/tutorials/<video>.<lang>.webm (same picture, the owner's voice)

If it stops with "found N pieces": a pause inside a sentence was too long, or a number was
skipped. Record that part again, or change GAP below.
"""
import json, os, re, subprocess, sys

GAP = 0.88  # sound closer than this (seconds) belongs to the same piece (pauses inside a sentence)
name, lang = sys.argv[1], sys.argv[2]
take = f"tutorials/recorded/{name}/{lang}/take.m4a"
plain = f"output/{name}.{lang}.plain.webm"
timing = json.load(open(f"output/{name}.{lang}.plain.timing.json"))
ff = subprocess.run(["node", "-e", "console.log(require('ffmpeg-static'))"], capture_output=True, text=True, check=True).stdout.strip()

probe = subprocess.run([ff, "-hide_banner", "-i", take, "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"], capture_output=True, text=True).stderr
total = sum(float(x) * 60 ** i for i, x in enumerate(reversed(re.search(r"Duration: ([\d:.]+)", probe).group(1).split(":"))))
silences, start = [], None
for kind, at in re.findall(r"silence_(start|end): ([\d.]+)", probe):
    if kind == "start": start = float(at)
    else: silences.append((start or 0.0, float(at))); start = None
if start is not None: silences.append((start, total))
sounds, t = [], 0.0
for a, b in silences:
    if a > t + 0.01: sounds.append([t, a])
    t = b
if t < total - 0.05: sounds.append([t, total])
pieces = []
for s in sounds:
    if pieces and s[0] - pieces[-1][1] < GAP: pieces[-1][1] = s[1]
    else: pieces.append(s)

sentences = timing["sentences"]
if len(pieces) != 2 * len(sentences):
    sys.exit(f"found {len(pieces)} pieces of sound, expected {2 * len(sentences)} (a number + a sentence each)")

parts, labels = [], []
for i, s in enumerate(sentences):
    piece, number = pieces[2 * i + 1], pieces[2 * i]
    following = pieces[2 * i + 2][0] if 2 * i + 2 < len(pieces) else total
    a, b = max(piece[0] - 0.12, number[1] + 0.08), min(piece[1] + 0.3, following - 0.05)
    at = s["at"] + 0.2
    if at + (b - a) > s["at"] + s["room"] + 0.3:
        print(f"line {i + 1:02}: {b - a:.1f} s is longer than its {s['room']:.1f} s; it runs into the next one")
    ms = int(at * 1000)
    parts.append(f"[v{i}]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st={b - a - 0.08:.3f}:d=0.08,adelay={ms}|{ms}[a{i}]")
    labels.append(f"[a{i}]")
n = len(sentences)
graph = ";".join(
    [f"[1:a]highpass=f=80,afftdn=nf=-28,aformat=channel_layouts=mono,asplit={n}" + "".join(f"[v{i}]" for i in range(n))]
    + parts
    + ["".join(labels) + f"amix=inputs={n}:normalize=0,apad,atrim=0:{timing['seconds']},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]"]
)
out = f"public/tutorials/{name}.{lang}.webm"
subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-i", plain, "-i", take, "-filter_complex", graph, "-map", "0:v", "-map", "[out]",
                "-c:v", "copy", "-c:a", "libopus", "-b:a", "96k", "-t", str(timing["seconds"]), out], check=True)
print(f"{out}: {os.path.getsize(out) / 1e6:.1f} MB, {n} sentences")
