#!/usr/bin/env python3
"""Download static TTF web fonts from Google Fonts for offline canvas rendering."""
import os
import re
import sys
import urllib.request

UA = "curl/8.7.1"

FAMILIES = {
    "playfair": "Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700",
    "inter": "Inter:wght@400;500;600;700",
    "grotesk": "Space+Grotesk:wght@500;700",
    "mono": "Space+Mono:ital,wght@0,400;0,700;1,400",
}

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    for slug, fam in FAMILIES.items():
        css = get("https://fonts.googleapis.com/css2?family=%s&display=swap" % fam).decode("utf-8")
        blocks = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)
        seen = set()
        for b in blocks:
            url = re.search(r"url\((https://[^)]+\.ttf)\)", b)
            if not url:
                continue
            weight = re.search(r"font-weight:\s*(\d+)", b)
            style = re.search(r"font-style:\s*(\w+)", b)
            weight = weight.group(1) if weight else "400"
            style = style.group(1) if style else "normal"
            name = "%s-%s-%s.ttf" % (slug, weight, style)
            if name in seen:
                continue
            seen.add(name)
            data = get(url.group(1))
            with open(os.path.join(OUT, name), "wb") as fh:
                fh.write(data)
            print("saved %s (%d bytes)" % (name, len(data)))


if __name__ == "__main__":
    main()
