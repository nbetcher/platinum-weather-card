#!/usr/bin/env python3
"""Trim the fat from the weather SVGs using measured content bounds.

Reads scripts/svg-viewboxes.json (produced from scripts/measure-svg-bounds.html,
which samples each icon's CSS animations over a full cycle so moving content
counts) and rewrites every dist/ weather SVG with a standard-size viewBox:

  - One WIDTH for the whole family (W = the union of every icon's content
    width) so no icon renders at a different scale and horizontal layout
    stays put; per-icon HEIGHT hugging the artwork so a width-constrained
    render is top-justified with no dead space above or below the glyph.
  - Per-icon window x: centered on the icon's content.

Idempotent: an svg that already carries a viewBox is rewritten from its
original 56x48 assumption only if it still declares width="56" height="48";
otherwise it is reported and skipped.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
DATA = json.loads((Path(__file__).parent / 'svg-viewboxes.json').read_text())
W, BOXES = DATA['W'], DATA['boxes']

# Most of the family is 56x48; two icons are 56x56 and the 'unknown' pair is
# 64x64 with a matching viewBox. Measurements were taken at natural render
# scale (1 css px = 1 user unit) so the same window values apply to each.
OPEN_TAG = re.compile(r'<svg([^>]*?)\swidth="\d+"\sheight="\d+"(?:\sviewBox="[^"]*")?([^>]*?)>')

changed, skipped = 0, 0
for name, (x, y, h) in BOXES.items():
    path = DIST / name
    if not path.exists():
        print(f'MISSING {name}')
        skipped += 1
        continue
    text = path.read_text(encoding='utf-8')
    def repl(m):
        return (f'<svg{m.group(1)} width="{W}" height="{h}" '
                f'viewBox="{x} {y} {W} {h}"{m.group(2)}>')
    new, n = OPEN_TAG.subn(repl, text, count=1)
    if n == 0:
        print(f'SKIP (unexpected root tag) {name}')
        skipped += 1
        continue
    # A pre-existing viewBox may sit elsewhere in the tag (eg. after version=)
    # - drop it so the root never carries duplicate attributes
    head, rest = new.split('>', 1)
    if head.count('viewBox=') > 1:
        first = head.index('viewBox=')
        dup = re.compile(r'\sviewBox="[^"]*"')
        head = head[:first + 8] + dup.sub('', head[first + 8:])
        new = head + '>' + rest
    path.write_text(new, encoding='utf-8')
    changed += 1

print(f'rewrote {changed} svgs, skipped {skipped}')
sys.exit(1 if skipped else 0)
