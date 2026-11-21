import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { promisify } from "node:util";

/**
 * The spoken voice of the tutorial videos (text → speech).
 *
 * Microsoft Azure's neural voices: Georgian "Eka" (ka-GE-EkaNeural) and an English
 * one. Set in .env.local (never committed; only used on the computer that records):
 *   AZURE_SPEECH_KEY=…      AZURE_SPEECH_REGION=westeurope (the region of your Speech resource)
 * Optional: TUTORIAL_VOICE_KA / TUTORIAL_VOICE_EN (another voice), TUTORIAL_VOICE_RATE ("-5%").
 * Without an Azure key: the same voices through `edge-tts` (the free "Read Aloud"
 * service of the Edge browser; no account), installed once into tutorials/.venv:
 *   python3 -m venv tutorials/.venv && tutorials/.venv/bin/pip install edge-tts
 * It is not Microsoft's official service for apps: use Azure before going live.
 * TUTORIAL_VOICE=say uses the Mac's own (English) voice — only for checking timing.
 * TUTORIAL_VOICE=none records silent videos.
 *
 * Every sentence is made once and kept in tutorials/.voice-cache/ (not committed),
 * so recording a video again costs nothing and sounds exactly the same.
 */

export type VoiceLanguage = "ka" | "en";
export type Clip = { file: string; seconds: number };
export type VoiceMode = "azure" | "edge" | "say" | "none";

const CACHE = join("tutorials", ".voice-cache");
const EDGE_TTS = process.env.EDGE_TTS_PATH || join("tutorials", ".venv", "bin", "edge-tts");

/**
 * A full ffmpeg (Playwright's can't do sound): FFMPEG_PATH, else the `ffmpeg-static`
 * dev package, else an ffmpeg installed on the computer.
 */
export function fullFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const path = createRequire(join(process.cwd(), "package.json"))("ffmpeg-static") as string | null;
    if (path && existsSync(path)) return path;
  } catch {
    // not installed: try the computer's own
  }
  if (spawnSync("ffmpeg", ["-version"]).status === 0) return "ffmpeg";
  throw new Error("Adding the voice needs a full ffmpeg: run `npm i -D ffmpeg-static` once (or set FFMPEG_PATH).");
}

export const VOICES: Record<VoiceLanguage, string> = {
  ka: process.env.TUTORIAL_VOICE_KA || "ka-GE-EkaNeural",
  en: process.env.TUTORIAL_VOICE_EN || "en-US-AvaNeural",
};
const RATE = process.env.TUTORIAL_VOICE_RATE || "-5%";

/** Which voice is used now (or why none can be). */
export function voiceMode(): VoiceMode {
  const chosen = process.env.TUTORIAL_VOICE;
  if (chosen === "none" || chosen === "say" || chosen === "edge") return chosen;
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) return "azure";
  if (existsSync(EDGE_TTS)) return "edge";
  throw new Error(
    "No voice for the tutorial videos: put AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local, or install edge-tts " +
      "(python3 -m venv tutorials/.venv && tutorials/.venv/bin/pip install edge-tts) — see docs/TUTORIAL_VIDEOS.md. " +
      "TUTORIAL_VOICE=none records silent videos.",
  );
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** What Azure reads: the sentence, the voice, a slightly calmer speed. */
export function ssml(text: string, language: VoiceLanguage, voice = VOICES[language], rate = RATE): string {
  const lang = language === "ka" ? "ka-GE" : "en-US";
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
}

/** How long a WAV file plays (seconds), read from its header. */
export function wavSeconds(wav: Buffer): number {
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let byteRate = 0;
  let dataSize = 0;
  for (let pos = 12; pos + 8 <= wav.length; ) {
    const id = wav.toString("ascii", pos, pos + 4);
    const size = wav.readUInt32LE(pos + 4);
    if (id === "fmt ") byteRate = wav.readUInt32LE(pos + 16);
    if (id === "data") {
      dataSize = Math.min(size, wav.length - pos - 8);
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (!byteRate || !dataSize) throw new Error("A WAV file without sound");
  return dataSize / byteRate;
}

/** The sentence spoken (from the cache, or made now). `null` = silent videos. */
export async function speak(text: string, language: VoiceLanguage): Promise<Clip | null> {
  const mode = voiceMode();
  if (mode === "none") return null;
  const voice = mode === "say" ? "mac-say" : VOICES[language];
  // Azure and edge-tts give the same voice: one cache for both (made once, by whichever is set up).
  const name = createHash("sha256").update(`${mode === "say" ? "say" : "neural"}|${voice}|${RATE}|${text}`).digest("hex").slice(0, 24);
  const file = join(CACHE, `${name}.wav`);
  if (!existsSync(file)) {
    mkdirSync(CACHE, { recursive: true });
    if (mode === "say") await promisify(execFile)("say", ["-o", file, "--file-format=WAVE", "--data-format=LEI16@48000", text]);
    else if (mode === "edge") await edge(text, voice, file);
    else writeFileSync(file, await azure(text, language, voice));
  }
  return { file, seconds: wavSeconds(readFileSync(file)) };
}

/** edge-tts gives an MP3; ffmpeg turns it into the same WAV (48 kHz, mono) as Azure's. */
async function edge(text: string, voice: string, file: string) {
  const mp3 = `${file}.mp3`;
  try {
    await promisify(execFile)(EDGE_TTS, ["--voice", voice, `--rate=${RATE}`, "--text", text, "--write-media", mp3]);
    await promisify(execFile)(fullFfmpeg(), ["-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", file]);
  } finally {
    rmSync(mp3, { force: true });
  }
}

async function azure(text: string, language: VoiceLanguage, voice: string): Promise<Buffer> {
  const region = process.env.AZURE_SPEECH_REGION!;
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      // The best quality Azure gives: 48 kHz, 16 bit, uncompressed. Compressed once, at the end.
      "X-Microsoft-OutputFormat": "riff-48khz-16bit-mono-pcm",
      "User-Agent": "mathtest-tutorials",
    },
    body: ssml(text, language, voice),
  });
  if (!response.ok) {
    const hint = response.status === 401 ? " (wrong AZURE_SPEECH_KEY, or a key from another region?)" : response.status === 429 ? " (too many requests: try again in a minute)" : "";
    throw new Error(`Azure speech failed: ${response.status} ${response.statusText}${hint}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
