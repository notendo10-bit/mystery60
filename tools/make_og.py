"""SNS共有用の画像(1200x630 JPEG)を images/og/ に作る。
使い方: python tools/make_og.py   (js/cases.js を変えたら build-pages.js と一緒に実行)"""
import json
import os
import re
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images", "og")
W, H = 1200, 630
SERIF = r"C:\Windows\Fonts\yumindb.ttf"
os.makedirs(OUT, exist_ok=True)

cases = json.loads(subprocess.check_output(
    ["node", "-e", "global.window={};require('./js/cases.js');"
                   "console.log(JSON.stringify(window.M60_CASES.map(c=>({id:c.id,title:c.title,genre:c.genre}))))"],
    cwd=ROOT, encoding="utf-8"))


def base(path, top_only=False):
    im = Image.open(path).convert("RGB")
    if top_only:  # camera は縦に2コマ。上の1コマだけ使う
        im = im.crop((0, 0, 1200, 770))
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))


def shade(im):
    a = np.asarray(im, float)
    y = np.linspace(0, 1, H)[:, None, None]
    return Image.fromarray(np.uint8(a * (1 - 0.86 * np.clip((y - 0.38) / 0.5, 0, 1))))


def spaced(d, xy, text, font, fill, gap):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + gap


def card(src, name, title, sub, top_only=False):
    im = shade(base(src, top_only))
    d = ImageDraw.Draw(im)
    size = 76 if len(title) <= 10 else 64
    d.text((56, H - 208), title, font=ImageFont.truetype(SERIF, size), fill=(240, 236, 226))
    d.text((58, H - 104), sub, font=ImageFont.truetype(SERIF, 30), fill=(201, 180, 138))
    spaced(d, (58, 40), "MYSTERY 60", ImageFont.truetype(SERIF, 28), (232, 228, 220), 4)
    im.save(os.path.join(OUT, name + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)


card(os.path.join(ROOT, "images", "hero.webp"), "home", "60秒の謎。", "解けたら、もう一問。短編ミステリー全12話")
for c in cases:
    card(os.path.join(ROOT, "images", c["id"] + ".webp"), c["id"], c["title"],
         c["genre"] + "｜あなたは60秒で解けるか", top_only=c["id"] == "camera")
print("made", len(cases) + 1)
