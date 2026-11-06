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
- **The list of entries** (`data/index.json`: id and a fingerprint, nothing more) is kept in the
  repository. The device that adds, changes or takes out an entry updates it through the GitHub API in the
  same step; `.github/scripts/data_index.py` rebuilds it, and the *Entries* workflow runs that on every push
  that touches `data/` as a check. Run it by hand before committing entries from here.
- **Pages publishes from the branch** (`main`, root), like the Finder sites. `.nojekyll` keeps every file.
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
  The title sets the Walters pair of Visigothic eagle brooches (54.421, 54.422, public domain), cut from
  their photograph's grey ground, into the carved frieze of Santa María de Quintanilla de las Viñas (7th
  century; photograph by Nacho Cobos, CC BY-SA 4.0, credited at the foot). The frieze, recoloured umber on
  parchment and gold on iron, is the faint pattern behind the page and the band at its foot. The app icon is
  the right-hand eagle on dark iron. "Runa" is written above the name in the Gothic alphabet, from a subset
  of FreeSerif (`assets/fonts/gothic-letters.woff`).
- Nothing Jewish or Hebrew anywhere; the owner asked for that.
- Phone first: 390 px wide, no sideways scroll, light and dark.

## How work is done here

- Keep instructions off the site. Page text is short and plain.
- Commit messages in plain words for the owner.
- Look before pushing: the page in a headless browser at 390 px and 1280 px, light and dark.
