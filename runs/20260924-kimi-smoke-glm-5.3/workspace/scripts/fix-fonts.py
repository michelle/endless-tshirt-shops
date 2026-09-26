#!/usr/bin/env python3
"""One-time asset fix: normalise the family names of the Google Fonts static
instance TTFs so every weight/style shares one family name ("Cinzel",
"Cormorant Garamond"). resvg and browsers both match on family + weight,
which the css2 static instances don't expose correctly out of the box."""
import glob
from fontTools.ttLib import TTFont

FIXES = {
    "Cinzel-400.ttf": ("Cinzel", "Regular", "Cinzel-Regular", 400, False),
    "Cinzel-600.ttf": ("Cinzel", "SemiBold", "Cinzel-SemiBold", 600, False),
    "CormorantGaramond-500.ttf": ("Cormorant Garamond", "Medium", "CormorantGaramond-Medium", 500, False),
    "CormorantGaramond-500i.ttf": ("Cormorant Garamond", "Medium Italic", "CormorantGaramond-MediumItalic", 500, True),
    "CormorantGaramond-600.ttf": ("Cormorant Garamond", "SemiBold", "CormorantGaramond-SemiBold", 600, False),
}

for path in sorted(glob.glob("src/lib/assets/fonts/*.ttf") + glob.glob("public/fonts/*.ttf")):
    name = path.split("/")[-1]
    if name not in FIXES:
        continue
    family, subfamily, ps, weight, italic = FIXES[name]
    f = TTFont(path)
    nt = f["name"]
    nt.setName(family, 1, 3, 1, 0x409)
    nt.setName(subfamily, 2, 3, 1, 0x409)
    nt.setName(f"{family} {subfamily}".strip(), 4, 3, 1, 0x409)
    nt.setName(ps, 6, 3, 1, 0x409)
    nt.setName(family, 16, 3, 1, 0x409)
    nt.setName(subfamily, 17, 3, 1, 0x409)
    os2 = f["OS/2"]
    os2.usWeightClass = weight
    if italic:
        os2.fsSelection = (os2.fsSelection & ~0x40) | 0x01
    f.save(path)
    print(f"patched {path}: family='{family}' subfamily='{subfamily}' weight={weight}")
