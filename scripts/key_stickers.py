#!/usr/bin/env python3
"""Cut a white-background sticker sheet (GPT Image 2.5) into transparent label PNGs.

usage: key_stickers.py sheet.png outdir [name1 name2 ...]
Names are assigned in reading order (left to right, top to bottom). Each sticker keeps its own
black drop shadow; the white sheet becomes transparent. Needs numpy, scipy, Pillow.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

sheet, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3:]
im = np.array(Image.open(sheet).convert('RGB')).astype(int)
mask = np.abs(im - 255).sum(axis=2) > 60
mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=3))
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
boxes = []
for k in range(1, n + 1):
    if sizes[k - 1] < mask.size * 0.002:
        continue  # specks
    ys, xs = np.where(lab == k)
    boxes.append((k, ys.min(), ys.max(), xs.min(), xs.max()))
row_h = np.median([b[2] - b[1] for b in boxes]) if boxes else 1
boxes.sort(key=lambda b: (round((b[1] + b[2]) / 2 / (row_h * 0.9)), b[3]))
for i, (k, y0, y1, x0, x1) in enumerate(boxes):
    name = names[i] if i < len(names) else f'label-{i + 1}'
    rgba = np.dstack([im.astype(np.uint8), ((lab == k) * 255).astype(np.uint8)])[y0:y1 + 1, x0:x1 + 1]
    Image.fromarray(rgba, 'RGBA').save(f'{outdir}/{name}.png')
    print(f'{name}.png {rgba.shape[1]}x{rgba.shape[0]}')
