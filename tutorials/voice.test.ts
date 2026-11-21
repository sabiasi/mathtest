import { describe, expect, it } from "vitest";
import { ssml, wavSeconds } from "./voice";

/** A tiny WAV file: `seconds` of silence, 48 kHz, 16 bit, mono. */
function wav(seconds: number): Buffer {
  const data = Buffer.alloc(Math.round(48000 * 2 * seconds));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(48000, 24); // sample rate
  header.writeUInt32LE(96000, 28); // bytes per second
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

describe("tutorial voice", () => {
  it("asks Azure for the Georgian voice, with special characters made safe", () => {
    const text = ssml("დააჭირეთ „წილადს“ — 1 < 2 & \"x\"", "ka", "ka-GE-EkaNeural", "-5%");
    expect(text).toContain('xml:lang="ka-GE"');
    expect(text).toContain('<voice name="ka-GE-EkaNeural">');
    expect(text).toContain('<prosody rate="-5%">');
    expect(text).toContain("„წილადს“ — 1 &lt; 2 &amp; &quot;x&quot;");
  });

  it("reads how long a WAV file plays", () => {
    expect(wavSeconds(wav(1.5))).toBeCloseTo(1.5, 3);
    expect(() => wavSeconds(Buffer.from("not a wav file at all, nope"))).toThrow();
  });
});
