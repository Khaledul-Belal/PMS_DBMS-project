#!/usr/bin/env python3
"""Draws the building illustrations used on the public pages.
Run:  python3 make_images.py     (writes into ../images)
Swap in real photographs later by replacing the files in that folder."""

import random, os

OUT = os.path.join(os.path.dirname(__file__), "..", "images")
os.makedirs(OUT, exist_ok=True)


def building(x, w, h, base_y, body, dark, lit, glass, seed, cols=None, rows=None):
    """One apartment block with a window grid."""
    rnd = random.Random(seed)
    s = []
    y = base_y - h
    s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{body}"/>')
    s.append(f'<rect x="{x}" y="{y}" width="{w*0.18:.0f}" height="{h}" fill="{dark}" opacity=".35"/>')
    # roof lip
    s.append(f'<rect x="{x-8}" y="{y-10}" width="{w+16}" height="12" rx="3" fill="{dark}"/>')
    cols = cols or max(2, int(w / 46))
    rows = rows or max(3, int(h / 58))
    gx = w / cols
    gy = (h - 34) / rows
    for r in range(rows):
        for c in range(cols):
            wx = x + c * gx + gx * 0.22
            wy = y + 26 + r * gy
            ww = gx * 0.56
            wh = gy * 0.52
            on = rnd.random() < 0.42
            s.append(f'<rect x="{wx:.0f}" y="{wy:.0f}" width="{ww:.0f}" height="{wh:.0f}" rx="2" '
                     f'fill="{lit if on else glass}" opacity="{0.95 if on else 0.75}"/>')
            s.append(f'<line x1="{wx:.0f}" y1="{wy+wh/2:.0f}" x2="{wx+ww:.0f}" y2="{wy+wh/2:.0f}" '
                     f'stroke="{dark}" stroke-width="1" opacity=".35"/>')
    return "".join(s)


def scene(path, sky_a, sky_b, palette, seed, W=800, Hh=560, title=""):
    rnd = random.Random(seed)
    body, dark, lit, glass, ground, accent = palette
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {Hh}" width="{W}" height="{Hh}" '
         f'role="img" aria-label="{title}">']
    s.append(f'<defs><linearGradient id="sky{seed}" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{sky_a}"/><stop offset="1" stop-color="{sky_b}"/></linearGradient>'
             f'<clipPath id="clip{seed}"><rect width="{W}" height="{Hh}" rx="18"/></clipPath></defs>')
    s.append(f'<g clip-path="url(#clip{seed})">')
    s.append(f'<rect width="{W}" height="{Hh}" fill="url(#sky{seed})"/>')
    s.append(f'<circle cx="{W-140}" cy="110" r="52" fill="{accent}" opacity=".35"/>')
    s.append(f'<circle cx="{W-140}" cy="110" r="32" fill="{accent}" opacity=".55"/>')

    base = Hh - 70
    # back row, faded
    bx = 20
    while bx < W - 40:
        bw = rnd.randint(70, 120)
        bh = rnd.randint(150, 290)
        s.append(f'<rect x="{bx}" y="{base-bh-30}" width="{bw}" height="{bh}" fill="{dark}" opacity=".18"/>')
        bx += bw + rnd.randint(10, 28)

    # front row
    blocks = [(60, 150, 330), (225, 120, 250), (360, 170, 400), (545, 130, 300), (690, 90, 210)]
    for i, (x, w, h) in enumerate(blocks):
        s.append(building(x, w, h, base, body, dark, lit, glass, seed * 10 + i))

    # ground + little details
    s.append(f'<rect x="0" y="{base}" width="{W}" height="{Hh-base}" fill="{ground}"/>')
    s.append(f'<rect x="0" y="{base}" width="{W}" height="6" fill="{dark}" opacity=".25"/>')
    for tx in (30, 200, 335, 520, 660, 770):
        s.append(f'<rect x="{tx-3}" y="{base-26}" width="6" height="26" fill="{dark}" opacity=".5"/>')
        s.append(f'<circle cx="{tx}" cy="{base-38}" r="18" fill="{accent}" opacity=".55"/>')
    s.append('</g></svg>')
    open(os.path.join(OUT, path), "w").write("".join(s))
    print("wrote", path)


# daylight, brand green
scene("city-day.svg", "#dcecdf", "#f3f7f1",
      ("#e8ece5", "#17221c", "#f2c14e", "#b9ccc3", "#d8ddd4", "#0e6b4e"), 7,
      title="Row of apartment buildings during the day")

# evening, windows lit
scene("city-evening.svg", "#1b2c3f", "#3d4a57",
      ("#2f3d47", "#0b1219", "#f7cf6b", "#4c6070", "#222d35", "#b57f12"), 13,
      title="Apartment buildings with lit windows in the evening")

# soft brand-tinted
scene("city-brand.svg", "#0e6b4e", "#14875f",
      ("#f0f4ef", "#0a3d2d", "#f2c14e", "#9fc0b3", "#0b5a41", "#f2c14e"), 21,
      title="Illustrated buildings in the brand colour")
