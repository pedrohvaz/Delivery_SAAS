from functools import lru_cache
from pathlib import Path

from PIL import ImageFont

ASSETS_DIR = Path(__file__).parent / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"


@lru_cache(maxsize=None)
def font_regular(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS_DIR / "DejaVuSans.ttf"), size)


@lru_cache(maxsize=None)
def font_bold(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS_DIR / "DejaVuSans-Bold.ttf"), size)


@lru_cache(maxsize=None)
def font_icons(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS_DIR / "fa-solid-900.ttf"), size)
