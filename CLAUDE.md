# Runa: working instructions

Runa (Gothic for "secret, mystery, counsel") is the owner's private book: passages from what he reads, the
novels and films he loves, and his own headings over all of them. It is a website and an Android app that
always show the same book.

## How it's built

- **No build step for the site.** `index.html` (the whole page), `assets/runa.js` (opening, locking and
  saving entries), `sw.js` (reading without a connection), `manifest.webmanifest`.
- **Every entry is its own locked file**, `data/<id>.locked`: JSON (`kind` passage | novel | film, then
  `text`, `book`, `author`, `where` / `title`, `author` or `director`, `year`, and for all `note`, `heads`,
  `added`, `changed`), encrypted to the public half of the singer key in `assets/voice-key.json`, in the
  same "FFV1" format as Fret Finder's and Key Finder's locked tracks, so the key the owner already has
  opens it. `assets/voice-check.locked` checks a key. The private half is never in this repository or any
  page. `tools/lock_entry.mjs ENTRIES.json` locks entries from here.
- **The list of entries** (`data/index.json`: id and a fingerprint, nothing more) is made when the site is
  published, by `.github/scripts/data_index.py` in the *Site* workflow, which deploys Pages through
  GitHub Actions. It is not kept in the repository.
- **Adding and changing** happens in the page: it locks the entry and writes the file through the GitHub
  API with a GitHub key (fine-grained, Contents read and write on this repository only) that the owner keeps
  on each device (`runa.gh`). The singer key is `ff.voicekey`, shared with the Finder sites on the same
  origin. The Keys page shows a code that puts both keys on the phone.
- **Today's passage** is chosen from the date alone, so every device shows the same one; each passage
  comes once before any comes twice.

## The app (`app/`)

- A Kotlin app with no AndroidX: a WebView on https://lordfran28.github.io/Runa/ (so the book and the site
  never differ), plus a home-screen widget with the day's passage, a daily notification at a chosen time,
  "Keep in Runa" in Android's share menu, and a code scanner (Google's, needs no camera permission) for the
  keys. The page talks to it through `window.RunaApp`; the app calls `window.runaShared` and
  `window.runaScanned`.
- The *App* workflow builds it on every change under `app/` and puts `Runa.apk` on the release "app".
  It is signed with `app/signing/runa.p12`, whose password is only in the Actions secret `RUNA_SIGNING`.
- Private: never on the Play Store.

## Look

- Like the Finder sites (EB Garamond and IM Fell, one reading column, parchment cards) with a slight,
  subtle Gothic variance: garnet, worn gold and dark iron. Patterns and the icon only from real Gothic
  pieces (Visigothic and Ostrogothic brooches, crowns and the like), never newly drawn or generated.
  The current icon, a plain R, stands in until the owner picks one.
- Nothing Jewish or Hebrew anywhere; the owner asked for that.
- Phone first: 390 px wide, no sideways scroll, light and dark.

## How work is done here

- Keep instructions off the site. Page text is short and plain.
- Commit messages in plain words for the owner.
- Look before pushing: the page in a headless browser at 390 px and 1280 px, light and dark.
