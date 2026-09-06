"""Inspect original raster pixels without modifying the artwork. Requires Pillow."""
import json
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = 60000000
with Image.open(sys.argv[1]) as image:
    if image.width * image.height > 60000000:
        raise ValueError("Image exceeds inspection pixel limit")
    alpha = image.convert("RGBA").getchannel("A")
    histogram = alpha.histogram()
    print(json.dumps({
        "format": image.format, "mode": image.mode,
        "width": image.width, "height": image.height,
        "nontransparentPixels": sum(histogram[1:]), "opaquePixels": histogram[255],
        "bounds": alpha.getbbox(), "hasTransparentPixels": histogram[0] > 0,
        "dpi": image.info.get("dpi"),
    }))
