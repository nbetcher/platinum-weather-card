#!/usr/bin/env python3
"""Trim the fat from the weather SVGs using measured content bounds.

Reads scripts/svg-viewboxes.json (produced from scripts/measure-svg-bounds.html,
which samples each icon's CSS animations over a full cycle so moving content
counts) and rewrites every dist/ weather SVG with a standard-size viewBox:

  - Exact-fit per-icon windows: each viewBox hugs its own artwork on all
    four sides (including animation travel and stroke). Uniform scale is the
    RENDERER's job: the card's modern layout renders at a fixed CSS zoom
    (px per user unit), while fixed-box contexts (classic overview, daily
    forecast tiles) use contain-fit, which sizes every icon equally.

Idempotent: the root tag's width/height/viewBox (original integer canvas or a
previously applied float window) are replaced wholesale, and any stray viewBox
elsewhere in the tag is stripped, so re-running converges on the same output.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
DATA = json.loads((Path(__file__).parent / 'svg-viewboxes.json').read_text())
BOXES = DATA['boxes']

# Most of the family is 56x48; two icons are 56x56 and the 'unknown' pair is
# 64x64 with a matching viewBox. Measurements were taken at natural render
# scale (1 css px = 1 user unit) so the same window values apply to each.
# Widths/heights may be floats after a previous exact-fit rewrite
OPEN_TAG = re.compile(r'<svg([^>]*?)\swidth="[\d.]+"\sheight="[\d.]+"(?:\sviewBox="[^"]*")?([^>]*?)>')
VIEWBOX_ATTR = re.compile(r'\sviewBox="[^"]*"')

changed, skipped = 0, 0
for name, (x, y, w, h) in BOXES.items():
    path = DIST / name
    if not path.exists():
        print(f'MISSING {name}')
        skipped += 1
        continue
    text = path.read_text(encoding='utf-8')
    def repl(m):
        # A pre-existing viewBox may sit elsewhere in the tag (eg. after
        # version=) - strip it so the root never carries duplicate attributes
        pre = VIEWBOX_ATTR.sub('', m.group(1))
        post = VIEWBOX_ATTR.sub('', m.group(2))
        return (f'<svg{pre} width="{w}" height="{h}" '
                f'viewBox="{x} {y} {w} {h}"{post}>')
    new, n = OPEN_TAG.subn(repl, text, count=1)
    if n == 0:
        print(f'SKIP (unexpected root tag) {name}')
        skipped += 1
        continue
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed += 1

print(f'rewrote {changed} svgs, skipped {skipped}')
sys.exit(1 if skipped else 0)
