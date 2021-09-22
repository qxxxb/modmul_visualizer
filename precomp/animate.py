from PIL import Image
from pathlib import Path
from tqdm import tqdm
import subprocess


base = Path("./multiplication")
SRC_PATH = base / "imgs"
DEST_PATH = base / "imgs_resized"

if not DEST_PATH.is_dir():
    DEST_PATH.mkdir()

files = list(SRC_PATH.iterdir())
files = sorted(files, key=lambda f: int(f.stem))

resolution = max(Image.open(f).size for f in files)
n_digits = len(str(len(files)))

for i, f in enumerate(tqdm(files)):
    img = Image.open(f)
    img = img.resize(resolution, resample=Image.NEAREST)
    img.save(DEST_PATH / "{}-{}".format(str(i).zfill(n_digits), f.name))

subprocess.run(
    f"ffmpeg -framerate 5 -pattern_type glob -i '{DEST_PATH}/*.png' out.mp4", shell=True
)
