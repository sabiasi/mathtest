/**
 * A .docx file is a ZIP archive of XML files. This writes (and, for the
 * tests, reads) such an archive with Node's own compression — no extra
 * package. Server-side only (node:zlib).
 */
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

export type ZipFile = { name: string; data: Uint8Array };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function header(size: number, fill: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(size);
  fill(new DataView(bytes.buffer));
  return bytes;
}

export function zip(files: ZipFile[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    // Pictures (PNG / JPEG) are compressed already: store them as they are.
    const stored = /\.(png|jpe?g)$/i.test(file.name);
    const body = stored ? file.data : new Uint8Array(deflateRawSync(file.data, { level: 9 }));
    const checksum = crc32(file.data);
    const method = stored ? 0 : 8;
    // "General purpose flag" 0x0800: the file name is UTF-8. Date: 1 Jan 2026 (fixed, so the same test gives the same file).
    const common = (view: DataView, at: number) => {
      view.setUint16(at, 20, true); // version needed
      view.setUint16(at + 2, 0x0800, true);
      view.setUint16(at + 4, method, true);
      view.setUint16(at + 6, 0, true); // time
      view.setUint16(at + 8, ((2026 - 1980) << 9) | (1 << 5) | 1, true); // date
      view.setUint32(at + 10, checksum, true);
      view.setUint32(at + 14, body.length, true);
      view.setUint32(at + 18, file.data.length, true);
      view.setUint16(at + 22, name.length, true);
      view.setUint16(at + 24, 0, true); // extra field length
    };
    const local = header(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      common(view, 4);
    });
    central.push(
      header(46, (view) => {
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true); // version made by
        common(view, 6);
        view.setUint32(42, offset, true); // where the local header starts
      }),
      name,
    );
    parts.push(local, name, body);
    offset += local.length + name.length + body.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = header(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, offset, true);
  });
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Reads an archive back (used by tests to look inside a generated .docx). Checks every file's checksum. */
export function unzip(data: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = data.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("not a zip file");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("broken zip directory");
    const method = view.getUint16(at + 10, true);
    const checksum = view.getUint32(at + 16, true);
    const packed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const skip = view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(data.subarray(at + 46, at + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const body = data.subarray(start, start + packed);
    const content = method === 0 ? body : new Uint8Array(inflateRawSync(body));
    if (crc32(content) !== checksum) throw new Error(`broken file in zip: ${name}`);
    files.set(name, content);
    at += 46 + nameLength + skip;
  }
  return files;
}
