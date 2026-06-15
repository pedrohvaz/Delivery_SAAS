from dataclasses import dataclass

from PIL import ImageFont

from .assets import font_bold, font_icons, font_regular
from .schemas import InfoExtra, Produto

# ─────────────────────────────────────────
# Constantes de layout (base para largura 1080px, escalonadas linearmente)
# ─────────────────────────────────────────

MARGIN = 40
HEADER_HEIGHT = 170
HEADER_HEIGHT_WITH_SUBTITLE = 220

PILL_HEIGHT = 54
PILL_GAP = 14
PILL_PADDING_X = 22
PILL_SECTION_GAP = 24

CARD_GAP = 22
CARD_HEIGHT = 168
CARD_IMAGE_SIZE = 128
CARD_PADDING = 16

FOOTER_HEIGHT = 190
QR_SIZE = 120
QR_PADDING = 10


@dataclass
class Fonts:
    title: ImageFont.FreeTypeFont
    subtitle: ImageFont.FreeTypeFont
    category: ImageFont.FreeTypeFont
    product_name: ImageFont.FreeTypeFont
    product_desc: ImageFont.FreeTypeFont
    price: ImageFont.FreeTypeFont
    pill: ImageFont.FreeTypeFont
    icon: ImageFont.FreeTypeFont
    footer: ImageFont.FreeTypeFont
    badge: ImageFont.FreeTypeFont


def load_fonts(width: int) -> Fonts:
    scale = width / 1080
    return Fonts(
        title=font_bold(max(18, round(48 * scale))),
        subtitle=font_regular(max(14, round(28 * scale))),
        category=font_bold(max(16, round(34 * scale))),
        product_name=font_bold(max(14, round(26 * scale))),
        product_desc=font_regular(max(12, round(20 * scale))),
        price=font_bold(max(14, round(28 * scale))),
        pill=font_regular(max(12, round(22 * scale))),
        icon=font_icons(max(12, round(24 * scale))),
        footer=font_regular(max(12, round(22 * scale))),
        badge=font_bold(max(12, round(20 * scale))),
    )


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return (int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16))


def hex_to_rgba(color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    r, g, b = hex_to_rgb(color)
    return (r, g, b, alpha)


def group_by_categoria(produtos: list[Produto]) -> dict[str, list[Produto]]:
    grupos: dict[str, list[Produto]] = {}
    for produto in produtos:
        grupos.setdefault(produto.categoria, []).append(produto)
    return grupos


def truncate_text(text: str, font: ImageFont.FreeTypeFont, max_width: float) -> str:
    if font.getlength(text) <= max_width:
        return text
    ellipsis = "…"
    truncated = text
    while truncated and font.getlength(truncated + ellipsis) > max_width:
        truncated = truncated[:-1]
    return (truncated + ellipsis) if truncated else ellipsis


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: float, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    idx = 0
    while idx < len(words) and len(lines) < max_lines:
        word = words[idx]
        candidate = f"{current} {word}".strip()
        if not current or font.getlength(candidate) <= max_width:
            current = candidate
            idx += 1
        else:
            lines.append(current)
            current = ""

    if current and len(lines) < max_lines:
        lines.append(current)

    if idx < len(words) and lines:
        lines[-1] = truncate_text(lines[-1], font, max_width)

    return lines


def pill_width(info: InfoExtra, text_font: ImageFont.FreeTypeFont, icon_font: ImageFont.FreeTypeFont) -> float:
    text_width = text_font.getlength(info.texto)
    icon_width = (icon_font.size + 12) if info.icone else 0
    return PILL_PADDING_X * 2 + text_width + icon_width


def layout_pills(
    infos: list[InfoExtra], width: int, text_font: ImageFont.FreeTypeFont, icon_font: ImageFont.FreeTypeFont
) -> list[list[InfoExtra]]:
    available = width - 2 * MARGIN
    rows: list[list[InfoExtra]] = []
    current_row: list[InfoExtra] = []
    current_width = 0.0
    for info in infos:
        w = pill_width(info, text_font, icon_font)
        gap = PILL_GAP if current_row else 0
        if current_row and current_width + gap + w > available:
            rows.append(current_row)
            current_row = []
            current_width = 0.0
            gap = 0
        current_row.append(info)
        current_width += gap + w
    if current_row:
        rows.append(current_row)
    return rows


def pills_block_height(rows: list[list[InfoExtra]]) -> int:
    if not rows:
        return 0
    return PILL_SECTION_GAP * 2 + len(rows) * PILL_HEIGHT + (len(rows) - 1) * PILL_GAP


def format_price(value: float) -> str:
    return f"R$ {value:.2f}".replace(".", ",")
