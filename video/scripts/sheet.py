"""Tiles out/stills/*.png into contact sheets (out/sheets/sheet-N.png), 3 columns x 4 rows."""
import glob, os
from PIL import Image, ImageDraw
files = sorted(glob.glob('out/stills/*.png')); os.makedirs('out/sheets', exist_ok=True)
W, H, C, R = 640, 360, 3, 4
for n in range(0, len(files), C * R):
    sheet = Image.new('RGB', (C * W, R * (H + 22)), 'white'); d = ImageDraw.Draw(sheet)
    for k, f in enumerate(files[n:n + C * R]):
        x, y = (k % C) * W, (k // C) * (H + 22)
        sheet.paste(Image.open(f).convert('RGB').resize((W, H)), (x, y + 22)); d.text((x + 6, y + 5), os.path.basename(f), fill='black')
    sheet.save(f'out/sheets/sheet-{n // (C * R) + 1}.png')
