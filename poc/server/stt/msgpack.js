/** Sous-ensemble de MessagePack suffisant pour le protocole Kyutai (sans dépendance, compatible Node et Workers). */
export function encode(value) {
  const out = []; const u8 = (...b) => out.push(...b);
  const str = (s) => { const b = new TextEncoder().encode(s); if (b.length < 32) u8(0xa0 | b.length); else if (b.length < 256) u8(0xd9, b.length); else u8(0xda, b.length >> 8, b.length & 255); out.push(...b); };
  const f32 = (x) => { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); u8(0xca, dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)); };
  const any = (v) => {
    if (v === null || v === undefined) return u8(0xc0);
    if (v === true || v === false) return u8(v ? 0xc3 : 0xc2);
    if (typeof v === "string") return str(v);
    if (typeof v === "number") {
      if (Number.isInteger(v) && v >= 0 && v < 128) return u8(v);
      if (Number.isInteger(v) && v >= 0 && v < 2 ** 32) return u8(0xce, (v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      return f32(v);
    }
    if (ArrayBuffer.isView(v) || Array.isArray(v)) {
      const n = v.length; if (n < 16) u8(0x90 | n); else if (n < 65536) u8(0xdc, n >> 8, n & 255); else u8(0xdd, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      if (v instanceof Float32Array || v instanceof Float64Array) { for (let i = 0; i < n; i++) f32(v[i]); return; }   // audio : toujours float32
      for (let i = 0; i < n; i++) any(v[i]); return;
    }
    const keys = Object.keys(v); u8(0x80 | keys.length); for (const k of keys) { str(k); any(v[k]); }
  };
  any(value); return new Uint8Array(out);
}
export function decode(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let p = 0;
  const strN = (n) => { const s = new TextDecoder().decode(b.subarray(p, p + n)); p += n; return s; };
  const arrN = (n) => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = read(); return a; };
  const mapN = (n) => { const o = {}; for (let i = 0; i < n; i++) { const k = read(); o[k] = read(); } return o; };
  function read() {
    const t = b[p++];
    if (t < 0x80) return t; if (t >= 0xe0) return t - 256;
    if ((t & 0xf0) === 0x80) return mapN(t & 15); if ((t & 0xf0) === 0x90) return arrN(t & 15); if ((t & 0xe0) === 0xa0) return strN(t & 31);
    switch (t) {
      case 0xc0: return null; case 0xc2: return false; case 0xc3: return true;
      case 0xca: { const v = dv.getFloat32(p); p += 4; return v; } case 0xcb: { const v = dv.getFloat64(p); p += 8; return v; }
      case 0xcc: return b[p++]; case 0xcd: { const v = dv.getUint16(p); p += 2; return v; } case 0xce: { const v = dv.getUint32(p); p += 4; return v; }
      case 0xcf: { const v = Number(dv.getBigUint64(p)); p += 8; return v; }
      case 0xd0: { const v = dv.getInt8(p); p += 1; return v; } case 0xd1: { const v = dv.getInt16(p); p += 2; return v; } case 0xd2: { const v = dv.getInt32(p); p += 4; return v; }
      case 0xd3: { const v = Number(dv.getBigInt64(p)); p += 8; return v; }
      case 0xd9: return strN(b[p++]); case 0xda: { const n = dv.getUint16(p); p += 2; return strN(n); } case 0xdb: { const n = dv.getUint32(p); p += 4; return strN(n); }
      case 0xc4: { const n = b[p++]; const v = b.slice(p, p + n); p += n; return v; } case 0xc5: { const n = dv.getUint16(p); p += 2; const v = b.slice(p, p + n); p += n; return v; }
      case 0xdc: { const n = dv.getUint16(p); p += 2; return arrN(n); } case 0xdd: { const n = dv.getUint32(p); p += 4; return arrN(n); }
      case 0xde: { const n = dv.getUint16(p); p += 2; return mapN(n); } case 0xdf: { const n = dv.getUint32(p); p += 4; return mapN(n); }
      default: throw new Error("msgpack: type non pris en charge 0x" + t.toString(16));
    }
  }
  return read();
}
