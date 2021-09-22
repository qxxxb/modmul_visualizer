import numpy as np
from scipy import ndimage as ndi
from skimage import feature
from PIL import Image, ImageOps
from pathlib import Path
from tqdm import tqdm
import subprocess


base = Path("./multiplicative_order")
SRC_PATH = base / "imgs_resized"
DEST_PATH = base / "imgs_edges"

if not DEST_PATH.is_dir():
    DEST_PATH.mkdir()

files = list(SRC_PATH.iterdir())
files = sorted(files, key=lambda f: int(f.stem.split("-")[0]))

for i, f in tqdm(enumerate(files)):
    img = Image.open(f)
    img = ImageOps.grayscale(img)
    img = np.array(img).astype(np.float32)

    edges = feature.canny(img, sigma=2)
    img = Image.fromarray(edges)
    img.save(DEST_PATH / f.name)

subprocess.run(f"ffmpeg -framerate 5 -pattern_type glob -i '{DEST_PATH}/*.png' out.mp4", shell=True)
