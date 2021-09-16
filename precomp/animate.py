from PIL import Image
from pathlib import Path
from tqdm import tqdm
import subprocess


SRC_PATH = Path("./imgs")
DEST_PATH = Path("./imgs_resized")

if not DEST_PATH.is_dir():
    DEST_PATH.mkdir()

files = list(SRC_PATH.iterdir())
files = sorted(files, key=lambda f: int(f.stem))

resolution = max(Image.open(f).size for f in files)
n_digits = len(str(len(files)))

for i, f in tqdm(enumerate(files)):
    img = Image.open(f)
    img = img.resize(resolution, resample=Image.NEAREST)
    img.save(DEST_PATH / "{}-{}".format(str(i).zfill(n_digits), f.name))


subprocess.run(f"ffmpeg -framerate 5 -pattern_type glob -i '{DEST_PATH}/*.png' out.mp4", shell=True)

"""
ffmpeg -framerate 5 -pattern_type glob -i '*.png' out.mp4
"""
