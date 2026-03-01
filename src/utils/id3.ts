interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  coverBlob?: Blob;
}

function parseID3v2(buf: ArrayBuffer): ID3Tags | null {
  const view = new DataView(buf);
  const version = view.getUint8(3);
  const size =
    ((view.getUint8(6) & 0x7f) << 21) |
    ((view.getUint8(7) & 0x7f) << 14) |
    ((view.getUint8(8) & 0x7f) << 7) |
    (view.getUint8(9) & 0x7f);
  const end = Math.min(10 + size, buf.byteLength);
  let offset = 10;
  const tags: ID3Tags & { [k: string]: unknown } = {};

  while (offset < end - 10) {
    let frameId: string, frameSize: number, headerSize: number;

    if (version >= 3) {
      if (offset + 10 > end) break;
      frameId = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1),
        view.getUint8(offset + 2), view.getUint8(offset + 3)
      );
      if (version === 4) {
        frameSize =
          ((view.getUint8(offset + 4) & 0x7f) << 21) |
          ((view.getUint8(offset + 5) & 0x7f) << 14) |
          ((view.getUint8(offset + 6) & 0x7f) << 7) |
          (view.getUint8(offset + 7) & 0x7f);
      } else {
        frameSize =
          (view.getUint8(offset + 4) << 24) |
          (view.getUint8(offset + 5) << 16) |
          (view.getUint8(offset + 6) << 8) |
          view.getUint8(offset + 7);
      }
      headerSize = 10;
    } else {
      if (offset + 6 > end) break;
      frameId = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2)
      );
      frameSize =
        (view.getUint8(offset + 3) << 16) |
        (view.getUint8(offset + 4) << 8) |
        view.getUint8(offset + 5);
      headerSize = 6;
    }

    if (frameSize <= 0 || frameSize > end - offset - headerSize) break;
    if (!frameId.match(/^[A-Z0-9]+$/)) break;

    const dataOffset = offset + headerSize;
    const textFrames: Record<string, string> = {
      TIT2: 'title', TPE1: 'artist', TALB: 'album',
      TT2: 'title', TP1: 'artist', TAL: 'album',
    };

    if (textFrames[frameId]) {
      try {
        const encoding = view.getUint8(dataOffset);
        let text = '';
        if (encoding === 0 || encoding === 3) {
          text = new TextDecoder(encoding === 3 ? 'utf-8' : 'iso-8859-1').decode(
            new Uint8Array(buf, dataOffset + 1, frameSize - 1)
          );
        } else if (encoding === 1 || encoding === 2) {
          const bytes = new Uint8Array(buf, dataOffset + 1, frameSize - 1);
          let dec = 'utf-16be';
          if (bytes.length >= 2) {
            if (bytes[0] === 0xff && bytes[1] === 0xfe) dec = 'utf-16le';
            else if (bytes[0] === 0xfe && bytes[1] === 0xff) dec = 'utf-16be';
          }
          text = new TextDecoder(dec).decode(bytes);
          if (text.charCodeAt(0) === 0xfeff || text.charCodeAt(0) === 0xfffe) text = text.substring(1);
        }
        text = text.replace(/\0/g, '').trim();
        if (text) (tags as Record<string, string>)[textFrames[frameId]] = text;
      } catch (_) { /* ignore */ }
    }

    if (frameId === 'APIC' || frameId === 'PIC') {
      try {
        let pos = dataOffset;
        const encoding = view.getUint8(pos); pos++;
        if (frameId === 'APIC') {
          let mime = '';
          while (pos < dataOffset + frameSize && view.getUint8(pos) !== 0) {
            mime += String.fromCharCode(view.getUint8(pos)); pos++;
          }
          pos++;
          pos++;
          if (encoding === 0 || encoding === 3) {
            while (pos < dataOffset + frameSize && view.getUint8(pos) !== 0) pos++;
            pos++;
          } else {
            while (pos < dataOffset + frameSize - 1) {
              if (view.getUint8(pos) === 0 && view.getUint8(pos + 1) === 0) { pos += 2; break; }
              pos += 2;
            }
          }
          if (!mime || mime === 'image/') mime = 'image/jpeg';
          const imgData = new Uint8Array(buf, pos, dataOffset + frameSize - pos);
          if (imgData.length > 100) tags.coverBlob = new Blob([imgData], { type: mime });
        } else {
          pos += 3; pos++;
          while (pos < dataOffset + frameSize && view.getUint8(pos) !== 0) pos++;
          pos++;
          const imgData2 = new Uint8Array(buf, pos, dataOffset + frameSize - pos);
          if (imgData2.length > 100) tags.coverBlob = new Blob([imgData2], { type: 'image/jpeg' });
        }
      } catch (_) { /* ignore */ }
    }

    offset = dataOffset + frameSize;
  }

  return tags.title || tags.artist || tags.coverBlob ? tags : null;
}

export async function readID3Tags(url: string): Promise<ID3Tags | null> {
  try {
    const resp = await fetch(url, { headers: { Range: 'bytes=0-524288' } });
    const buf = await resp.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      return parseID3v2(buf);
    }
    return null;
  } catch (_) { return null; }
}

export async function readID3FromBlob(blob: Blob): Promise<ID3Tags | null> {
  try {
    const size = Math.min(blob.size, 524288);
    const buf = await blob.slice(0, size).arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      return parseID3v2(buf);
    }
    return null;
  } catch (_) { return null; }
}
