"""Writes data/index.json: every locked entry in data/ with a short fingerprint of its file.

Devices read this list, then fetch only the entries whose fingerprint they haven't seen. Nothing in it says
what an entry holds. A device that adds or changes an entry updates the list itself; the Entries workflow
runs this as a check on every push, and it can be run by hand before committing entries from here.
"""
import hashlib
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")


def main():
    entries = []
    for name in sorted(os.listdir(ROOT)) if os.path.isdir(ROOT) else []:
        if not name.endswith(".locked"):
            continue
        with open(os.path.join(ROOT, name), "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()[:12]
        entries.append({"id": name[: -len(".locked")], "h": h})
    os.makedirs(ROOT, exist_ok=True)
    with open(os.path.join(ROOT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"entries": entries}, f, separators=(",", ":"))
        f.write("\n")
    print("%d entries" % len(entries))


if __name__ == "__main__":
    main()
