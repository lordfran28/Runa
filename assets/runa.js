/* Runa: the locked book.
   Every entry (a passage, a novel or a film) is its own file in data/, locked to the public half of the
   singer key, the same key and format as Fret Finder's and Key Finder's locked tracks ("FFV1"). Only a device
   that holds the singer key can open them. data/index.json lists the files and a short fingerprint of each,
   so a device fetches only what changed.
   Adding, changing and taking out entries goes straight to the repository through GitHub, with a GitHub key
   kept on the device. Nothing else leaves it. */
(function () {
  "use strict";
  var OWNER = "lordfran28", REPO = "Runa", BRANCH = "main";
  var S = window.crypto && window.crypto.subtle;
  var INFO = new TextEncoder().encode("fret-finder voice");
  var KEY = "ff.voicekey", GH = "runa.gh", PENDING = "runa.pending";

  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }

  var pubP = null;
  function pub() { return pubP || (pubP = fetch("assets/voice-key.json").then(function (r) { return r.json(); })); }

  function open(buf, d) {
    var u = new Uint8Array(buf);
    if (u.length < 82 || String.fromCharCode(u[0], u[1], u[2], u[3]) !== "FFV1") return Promise.reject(new Error("not a locked file"));
    var epk = u.slice(4, 69), iv = u.slice(69, 81), ct = u.slice(81);
    return pub().then(function (p) {
      return Promise.all([
        S.importKey("jwk", { kty: "EC", crv: "P-256", x: p.x, y: p.y, d: d, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]),
        S.importKey("raw", epk, { name: "ECDH", namedCurve: "P-256" }, false, [])
      ]);
    }).then(function (k) { return S.deriveBits({ name: "ECDH", public: k[1] }, k[0], 256); })
      .then(function (bits) { return S.importKey("raw", bits, "HKDF", false, ["deriveKey"]); })
      .then(function (hk) { return S.deriveKey({ name: "HKDF", hash: "SHA-256", salt: epk, info: INFO }, hk, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); })
      .then(function (k) { return S.decrypt({ name: "AES-GCM", iv: iv }, k, ct); });
  }
  function lock(plain) {
    var epkRaw, eph;
    return pub().then(function (p) {
      return Promise.all([
        S.importKey("jwk", { kty: "EC", crv: "P-256", x: p.x, y: p.y, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, []),
        S.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
      ]);
    }).then(function (k) {
      eph = k[1];
      return Promise.all([S.exportKey("raw", eph.publicKey), S.deriveBits({ name: "ECDH", public: k[0] }, eph.privateKey, 256)]);
    }).then(function (r) {
      epkRaw = new Uint8Array(r[0]);
      return S.importKey("raw", r[1], "HKDF", false, ["deriveKey"]);
    }).then(function (hk) { return S.deriveKey({ name: "HKDF", hash: "SHA-256", salt: epkRaw, info: INFO }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt"]); })
      .then(function (key) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return S.encrypt({ name: "AES-GCM", iv: iv }, key, plain).then(function (ct) {
          ct = new Uint8Array(ct);
          var out = new Uint8Array(81 + ct.length);
          out.set(new TextEncoder().encode("FFV1"), 0); out.set(epkRaw, 4); out.set(iv, 69); out.set(ct, 81);
          return out;
        });
      });
  }
  function fingerprint(bytes) {
    return S.digest("SHA-256", bytes).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h).slice(0, 6), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }
  function testKey(d) {
    return fetch("assets/voice-check.locked", { cache: "no-store" }).then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { return open(b, d); })
      .then(function (pt) { return new TextDecoder().decode(pt) === "ok"; }, function () { return false; });
  }

  /* ---------- Reading the book ---------- */
  var entries = [];
  function load() {
    var d = get(KEY);
    if (!d) return Promise.resolve(null);
    return fetch("data/index.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { entries: [] }; }, function () { return { entries: [] }; })
      .then(function (ix) {
        var list = (ix && ix.entries) || [];
        return Promise.all(list.map(function (e) {
          return fetch("data/" + encodeURIComponent(e.id) + ".locked?h=" + e.h)
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(function (b) { return open(b, d); })
            .then(function (pt) { var x = JSON.parse(new TextDecoder().decode(pt)); x.id = e.id; return x; })
            .catch(function () { return null; });
        })).then(function (got) { return { index: list, got: got.filter(Boolean) }; });
      })
      .then(function (r) {
        /* what this device added or changed and the site doesn't show yet */
        var pend = getJSON(PENDING, {}), byId = {}, live = {}, now = Date.now();
        r.index.forEach(function (e) { live[e.id] = e.h; });
        r.got.forEach(function (x) { byId[x.id] = x; });
        Object.keys(pend).forEach(function (id) {
          var p = pend[id];
          var landed = p.op === "del" ? !(id in live) : live[id] === p.h;
          if (landed || now - p.at > 6 * 3600 * 1000) { delete pend[id]; return; }
          if (p.op === "del") delete byId[id]; else { p.entry.id = id; byId[id] = p.entry; }
        });
        put(PENDING, Object.keys(pend).length ? JSON.stringify(pend) : "");
        entries = Object.keys(byId).map(function (k) { return byId[k]; });
        return entries;
      });
  }

  /* ---------- Writing to the book, through GitHub ---------- */
  var API = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/";
  function gh(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: { "Authorization": "Bearer " + get(GH), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 404 && method === "GET") return null;
      if (!r.ok) return r.text().then(function (t) { var e = new Error("GitHub " + r.status); e.status = r.status; e.detail = t; throw e; });
      return r.json();
    });
  }
  /* data/index.json lists every entry with its fingerprint. The device that adds, changes or takes out an
     entry brings the list up to date in the same breath, so every device sees it once the site republishes. */
  function unb64(s) { var bin = atob(String(s).replace(/\s+/g, "")), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function updateIndex(id, h, tries) {
    var path = "data/index.json";
    return gh("GET", path).then(function (x) {
      var ix = { entries: [] };
      if (x && x.content) { try { ix = JSON.parse(new TextDecoder().decode(unb64(x.content))); } catch (e) {} }
      var list = (ix.entries || []).filter(function (e) { return e.id !== id; });
      if (h) list.push({ id: id, h: h });
      list.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
      var body = { message: "Update the list of entries", content: b64(new TextEncoder().encode(JSON.stringify({ entries: list }) + "\n")), branch: BRANCH };
      if (x && x.sha) body.sha = x.sha;
      return gh("PUT", path, body);
    }).catch(function (e) {
      if ((tries || 0) < 2 && e && (e.status === 409 || e.status === 422)) return updateIndex(id, h, (tries || 0) + 1);
      throw e;
    });
  }
  function b64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function newId() {
    var t = Date.now().toString(36), r = crypto.getRandomValues(new Uint8Array(3));
    return t + "-" + Array.prototype.map.call(r, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  var WORD = { passage: "a passage", novel: "a novel", film: "a film" };
  function save(entry) {
    var id = entry.id || newId(), isNew = !entry.id, path = "data/" + id + ".locked", now = new Date().toISOString();
    var e = JSON.parse(JSON.stringify(entry)); delete e.id;
    if (!e.added) e.added = now;
    e.changed = now;
    var bytes;
    return lock(new TextEncoder().encode(JSON.stringify(e)))
      .then(function (b) { bytes = b; return isNew ? null : gh("GET", path).then(function (x) { return x && x.sha; }); })
      .then(function (sha) {
        var body = { message: (isNew ? "Add " : "Change ") + WORD[e.kind], content: b64(bytes), branch: BRANCH };
        if (sha) body.sha = sha;
        return gh("PUT", path, body);
      })
      .then(function () { return fingerprint(bytes); })
      .then(function (h) { return updateIndex(id, h).then(function () { return h; }); })
      .then(function (h) {
        var pend = getJSON(PENDING, {}); pend[id] = { op: "put", h: h, at: Date.now(), entry: e }; put(PENDING, JSON.stringify(pend));
        e.id = id;
        var i = entries.findIndex(function (x) { return x.id === id; });
        if (i >= 0) entries[i] = e; else entries.push(e);
        return e;
      });
  }
  function remove(entry) {
    var path = "data/" + entry.id + ".locked";
    return gh("GET", path).then(function (x) {
      if (!x) return null;
      return gh("DELETE", path, { message: "Take out " + WORD[entry.kind], sha: x.sha, branch: BRANCH });
    }).then(function () { return updateIndex(entry.id, null); }).then(function () {
      var pend = getJSON(PENDING, {}); pend[entry.id] = { op: "del", at: Date.now() }; put(PENDING, JSON.stringify(pend));
      entries = entries.filter(function (x) { return x.id !== entry.id; });
    });
  }

  window.Runa = {
    key: function () { return get(KEY); }, setKey: function (v) { put(KEY, v); },
    ghKey: function () { return get(GH); }, setGhKey: function (v) { put(GH, v); },
    testKey: testKey, load: load, save: save, remove: remove,
    entries: function () { return entries; },
    checkGh: function (token) {
      return fetch("https://api.github.com/repos/" + OWNER + "/" + REPO, { headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return !!(j && j.permissions && j.permissions.push); }, function () { return false; });
    }
  };
})();
