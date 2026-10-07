#!/usr/bin/env python3
"""Publica u oculta Mesa Viajera en el sitio estático de EVA."""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / ".github" / "mesa-source"
CONFIG = json.loads((SOURCE / "config.json").read_text(encoding="utf-8"))
SLOTS = re.compile(r"<!-- EVA_SLOT_([A-Z_]+)_START -->(.*?)<!-- EVA_SLOT_([A-Z_]+)_END -->", re.S)

def switch_variants(text, pairs, visible, path):
    for active, paused in pairs:
        before, after = (paused, active) if visible else (active, paused)
        if before in text:
            text = text.replace(before, after)
        elif after not in text:
            raise RuntimeError(f"Missing expected text in {path}: {before[:70]}")
    return text

def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("visible", "oculta"):
        raise SystemExit("Uso: toggle_mesa.py visible|oculta")
    visible = sys.argv[1] == "visible"
    for rel_path, expected_names in CONFIG["pages"].items():
        path = ROOT / rel_path
        original = path.read_text(encoding="utf-8")
        found = []

        def change_slot(match):
            name = match.group(1)
            if name != match.group(3):
                raise RuntimeError(f"Mismatched section marker in {rel_path}: {name}")
            found.append(name)
            content = CONFIG["snippets"][name] if visible else ""
            return f"<!-- EVA_SLOT_{name}_START -->{content}<!-- EVA_SLOT_{name}_END -->"

        updated = SLOTS.sub(change_slot, original)
        if sorted(found) != sorted(expected_names):
            raise RuntimeError(f"Unexpected section markers in {rel_path}: {found}")
        updated = switch_variants(updated, CONFIG["variants"].get(rel_path, []), visible, rel_path)
        path.write_text(updated, encoding="utf-8")

    for rel_path, pairs in CONFIG["variants"].items():
        if rel_path in CONFIG["pages"]:
            continue
        path = ROOT / rel_path
        original = path.read_text(encoding="utf-8")
        path.write_text(switch_variants(original, pairs, visible, rel_path), encoding="utf-8")

    for rel_path in CONFIG["source_files"]:
        public = ROOT / rel_path
        if visible:
            public.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(SOURCE / rel_path, public)
        else:
            public.unlink(missing_ok=True)

    print(f"Mesa Viajera: {'visible' if visible else 'oculta'}")

if __name__ == "__main__":
    main()
