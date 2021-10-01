from string import ascii_lowercase
from itertools import product
import gizeh
import numpy as np
import random
import gmpy2
from pathlib import Path
from tqdm import tqdm
import subprocess


def get_primes(n):
    ans = []
    p = gmpy2.mpz(2)
    while p < n:
        ans.append(p)
        p = gmpy2.next_prime(p)
    return ans


def legendre_symbol(a, p):
    return pow(a, (p - 1) // 2, p)


def draw(p):
    surface = gizeh.Surface(width=width, height=height, bg_color=(255, 255, 255, 255))

    r = width / 2 * 3 / 4
    offset = (width / 2, height / 2)

    i = 1
    for theta in np.linspace(0, 2 * np.pi, p)[:-1]:
        t = theta
        xy = (r * np.sin(t) + offset[0], r * np.cos(t) + offset[1])

        if legendre_symbol(i, p) == 1:
            line = gizeh.polyline(
                points=[offset, xy],
                stroke_width=3,
                stroke=(1, 0, 0),
                fill=(0, 1, 0),
            )
            line.draw(surface)

        if p < 70:
            text = gizeh.text(
                str(i), fontfamily="monospace", fontsize=20, fill=(0, 0, 0), xy=xy, angle=0
            )
            text.draw(surface)

        i += 1

    surface.write_to_png(str(DEST_PATH / f"{str(p).zfill(4)}.png"))


DEST_PATH = Path("./legendre_symbol")

if not DEST_PATH.is_dir():
    DEST_PATH.mkdir()

width = 1024
height = 1024

primes = get_primes(500)
for p in tqdm(primes):
    draw(p)

subprocess.run(
    f"ffmpeg -framerate 5 -pattern_type glob -i '{DEST_PATH}/*.png' out.mp4", shell=True
)
