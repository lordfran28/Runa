#!/usr/bin/env node
// Locks entries into the book: node tools/lock_entry.mjs ENTRIES.json
// ENTRIES.json is a list of entries ({"kind": "passage"|"novel"|"film", ...}); each one is written to
// data/<id>.locked, encrypted to the public half of the singer key (assets/voice-key.json), the same format
// as Fret Finder's locked tracks ("FFV1"). The private half is never in this repository.
import { webcrypto as wc } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const S = wc.subtle, ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INFO = new TextEncoder().encode("fret-finder voice");

export async function lockBytes(plain, pubJwk) {
  const owner = await S.importKey("jwk", { kty: "EC", crv: "P-256", x: pubJwk.x, y: pubJwk.y, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const eph = await S.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const epkRaw = new Uint8Array(await S.exportKey("raw", eph.publicKey));
  const bits = await S.deriveBits({ name: "ECDH", public: owner }, eph.privateKey, 256);
  const hk = await S.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await S.deriveKey({ name: "HKDF", hash: "SHA-256", salt: epkRaw, info: INFO }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await S.encrypt({ name: "AES-GCM", iv }, key, plain));
  const out = new Uint8Array(81 + ct.length);
  out.set(new TextEncoder().encode("FFV1"), 0); out.set(epkRaw, 4); out.set(iv, 69); out.set(ct, 81);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const inp = process.argv[2];
  if (!inp) { console.error("usage: node tools/lock_entry.mjs ENTRIES.json"); process.exit(2); }
  const pub = JSON.parse(readFileSync(join(ROOT, "assets", "voice-key.json"), "utf8"));
  const list = JSON.parse(readFileSync(inp, "utf8"));
  mkdirSync(join(ROOT, "data"), { recursive: true });
  let t = Date.now();
  for (const e of list) {
    const id = e.id || (t++).toString(36) + "-" + Buffer.from(wc.getRandomValues(new Uint8Array(3))).toString("hex");
    const body = { ...e }; delete body.id;
    body.added = body.added || new Date().toISOString(); body.changed = body.changed || body.added;
    writeFileSync(join(ROOT, "data", id + ".locked"), await lockBytes(new TextEncoder().encode(JSON.stringify(body)), pub));
    console.log("data/" + id + ".locked  " + (e.title || e.book || e.kind));
  }
}
