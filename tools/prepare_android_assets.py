"""Copy the web game into the Android app's assets and bundle the fonts,
so the APK works fully offline.

Usage: python3 tools/prepare_android_assets.py
"""
import re
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "android/app/src/main/assets/www"
FONT_CSS = "https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;800&display=swap"
UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for name in ("css", "js"):
        shutil.copytree(ROOT / name, OUT / name)
    shutil.copy(ROOT / "icon.svg", OUT / "icon.svg")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")

    try:
        css = fetch(FONT_CSS).decode("utf-8")
        # keep only the latin subsets (the game text is English)
        blocks = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
        keep = [b for subset, b in blocks if subset == "latin"] or re.findall(r"@font-face \{.*?\}", css, re.S)
        fonts_dir = OUT / "fonts"
        fonts_dir.mkdir()
        local_css = []
        for i, block in enumerate(keep):
            url = re.search(r"url\((https://[^)]+)\)", block).group(1)
            fname = f"font{i}.woff2"
            (fonts_dir / fname).write_bytes(fetch(url))
            local_css.append(block.replace(url, fname))
        (fonts_dir / "fonts.css").write_text("\n".join(local_css), encoding="utf-8")
        html = re.sub(r'<link rel="preconnect"[^>]*>\n', "", html)
        html = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>',
                      '<link rel="stylesheet" href="fonts/fonts.css">', html)
        print(f"Bundled {len(keep)} font files")
    except Exception as e:  # offline build: system fonts are used instead
        print("Fonts not bundled:", e)

    (OUT / "index.html").write_text(html, encoding="utf-8")
    print("Assets ready in", OUT)


if __name__ == "__main__":
    main()
