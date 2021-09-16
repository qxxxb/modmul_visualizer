from PIL import Image
from pathlib import Path
from matplotlib import cm
from tqdm import tqdm
import numpy as np

viridis = cm.get_cmap("viridis")

IMGS_PATH = Path("./imgs")
N_PRIMES = 50


def gen_texture(modulus):
    n = modulus - 1
    data = np.empty((n, n, 4), dtype=np.dtype("uint8"))

    F = GF(modulus)

    for x in range(1, modulus):
        for y in range(1, modulus):
            if False:
                # This looks nice but can be 2x slower
                v = F((x * y) % modulus).multiplicative_order()
                print(x, y, v)
                v /= modulus
            else:
                v = F((x * y) % modulus).is_primitive_root()

            color = viridis(float(v))
            color = [int(c * 255) for c in color]

            data[x - 1][y - 1] = color

    return data


if __name__ == "__main__":
    if not IMGS_PATH.is_dir():
        IMGS_PATH.mkdir()

    primes = Primes()[:N_PRIMES]
    for p in tqdm(primes):
        data = gen_texture(p)
        img = Image.fromarray(data)
        img.save(IMGS_PATH / f"{str(p)}.png")
