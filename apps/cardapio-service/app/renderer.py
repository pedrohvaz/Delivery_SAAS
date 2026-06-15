import math
from io import BytesIO
from typing import Optional

import qrcode
import requests
from PIL import Image, ImageDraw, ImageFilter, ImageOps

from .assets import font_icons
from .icons import glyph_for
from .layout import (
    CARD_GAP,
    CARD_HEIGHT,
    CARD_IMAGE_SIZE,
    CARD_PADDING,
    FOOTER_HEIGHT,
    HEADER_HEIGHT,
    HEADER_HEIGHT_WITH_SUBTITLE,
    MARGIN,
    PILL_GAP,
    PILL_HEIGHT,
    PILL_PADDING_X,
    PILL_SECTION_GAP,
    QR_PADDING,
    QR_SIZE,
    Fonts,
    format_price,
    group_by_categoria,
    hex_to_rgb,
    hex_to_rgba,
    layout_pills,
    load_fonts,
    pill_width,
    pills_block_height,
    truncate_text,
    wrap_text,
)
from .schemas import CardapioRequest, InfoExtra, Produto

TextColor = tuple[int, int, int]


def render(payload: CardapioRequest, template: dict, background: Optional[Image.Image] = None) -> bytes:
    width = payload.largura
    fonts = load_fonts(width)

    grupos = group_by_categoria(payload.produtos)
    pills_topo = [info for info in payload.infos_extras if info.posicao == "topo"]
    pills_rodape = [info for info in payload.infos_extras if info.posicao == "rodape"]
    rows_topo = layout_pills(pills_topo, width, fonts.pill, fonts.icon) if pills_topo else []
    rows_rodape = layout_pills(pills_rodape, width, fonts.pill, fonts.icon) if pills_rodape else []

    header_h = HEADER_HEIGHT_WITH_SUBTITLE if payload.subtitulo else HEADER_HEIGHT

    grid_h = 0
    for produtos in grupos.values():
        rows_count = math.ceil(len(produtos) / max(1, payload.num_colunas))
        grid_h += _category_label_height(fonts) + rows_count * (CARD_HEIGHT + CARD_GAP)

    total_height = (
        header_h
        + pills_block_height(rows_topo)
        + grid_h
        + pills_block_height(rows_rodape)
        + FOOTER_HEIGHT
    )

    bg_color = hex_to_rgb(template["cor_fundo"])
    if background is not None:
        img = _prepare_background(background, width, total_height, template, payload)
    else:
        img = Image.new("RGB", (width, total_height), bg_color)

    draw = ImageDraw.Draw(img, "RGBA")

    y = _draw_header(draw, img, payload, template, fonts, width, header_h)
    if rows_topo:
        y = _draw_pills(draw, rows_topo, template, fonts, width, y)
    y = _draw_grid(draw, img, grupos, payload, template, fonts, width, y)
    if rows_rodape:
        y = _draw_pills(draw, rows_rodape, template, fonts, width, y)
    _draw_footer(draw, img, payload, template, fonts, width, total_height)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def resize_to_width(img: Image.Image, width: int) -> bytes:
    """Redimensiona uma imagem (ex.: gerada por DALL-E) para a largura pedida, mantendo a proporção."""
    ratio = width / img.width
    height = round(img.height * ratio)
    resized = img.convert("RGB").resize((width, height), Image.LANCZOS)
    buf = BytesIO()
    resized.save(buf, format="PNG")
    return buf.getvalue()


def _prepare_background(
    background: Image.Image, width: int, height: int, template: dict, payload: CardapioRequest
) -> Image.Image:
    img = ImageOps.fit(background.convert("RGB"), (width, height), Image.LANCZOS)

    config_ia = payload.config_ia
    if config_ia and config_ia.blur_fundo > 0:
        img = img.filter(ImageFilter.GaussianBlur(config_ia.blur_fundo))

    if config_ia and config_ia.overlay_opacidade > 0:
        alpha = max(0, min(255, round(255 * config_ia.overlay_opacidade)))
        overlay = Image.new("RGBA", img.size, (*hex_to_rgb(template["cor_fundo"]), alpha))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    return img


# ─────────────────────────────────────────
# Imagens remotas / placeholders
# ─────────────────────────────────────────


def fetch_image(url: Optional[str], timeout: int = 15) -> Optional[Image.Image]:
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGBA")
    except Exception:
        return None


def _circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    return mask


def _circular_image(img: Image.Image, size: int) -> Image.Image:
    fitted = ImageOps.fit(img.convert("RGBA"), (size, size), Image.LANCZOS)
    mask = _circle_mask(size)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(fitted, (0, 0), mask)
    return out


UTENSILS_GLYPH = ""  # Font Awesome solid: utensils (placeholder de produto sem foto)


def _mix(a: TextColor, b: TextColor, t: float) -> TextColor:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))  # type: ignore[return-value]


def _placeholder_circle(size: int, card_color: TextColor, text_color: TextColor) -> Image.Image:
    """Placeholder sutil: círculo levemente contrastante com o card + ícone de talheres."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, size, size), fill=(*_mix(card_color, text_color, 0.14), 255))

    icon_font = font_icons(max(12, round(size * 0.42)))
    bbox = d.textbbox((0, 0), UTENSILS_GLYPH, font=icon_font)
    gx = (size - (bbox[2] - bbox[0])) / 2 - bbox[0]
    gy = (size - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((gx, gy), UTENSILS_GLYPH, font=icon_font, fill=(*_mix(card_color, text_color, 0.5), 235))
    return img


def _circular_photo(url: Optional[str], size: int, card_color: TextColor, text_color: TextColor) -> Image.Image:
    fetched = fetch_image(url)
    if fetched:
        return _circular_image(fetched, size)
    return _placeholder_circle(size, card_color, text_color)


# ─────────────────────────────────────────
# Header
# ─────────────────────────────────────────


def _draw_header(draw: ImageDraw.ImageDraw, img: Image.Image, payload, template, fonts: Fonts, width: int, header_h: int) -> int:
    draw.rectangle((0, 0, width, header_h), fill=hex_to_rgb(template["cor_destaque"]))

    if template.get("is_promocao"):
        _draw_promo_banner(img, template, width, header_h)
        draw = ImageDraw.Draw(img, "RGBA")

    text_color = hex_to_rgb(template["cor_header_texto"])

    logo_offset = 0
    if payload.incluir_logo:
        logo_size = payload.logo_tamanho or 80
        fetched_logo = fetch_image(payload.logo_url)
        if fetched_logo:
            logo = _circular_image(fetched_logo, logo_size)
            img.paste(logo, (MARGIN, (header_h - logo_size) // 2), logo)
            logo_offset = logo_size + 24

    title_x = MARGIN + logo_offset
    available_width = width - title_x - MARGIN
    title = truncate_text(payload.titulo, fonts.title, available_width)
    title_bbox = draw.textbbox((0, 0), title, font=fonts.title)
    title_h = title_bbox[3] - title_bbox[1]

    if payload.subtitulo:
        subtitle = truncate_text(payload.subtitulo, fonts.subtitle, available_width)
        sub_bbox = draw.textbbox((0, 0), subtitle, font=fonts.subtitle)
        sub_h = sub_bbox[3] - sub_bbox[1]
        total_text_h = title_h + 12 + sub_h
        title_y = (header_h - total_text_h) // 2
        draw.text((title_x, title_y - title_bbox[1]), title, font=fonts.title, fill=text_color)
        draw.text((title_x, title_y + title_h + 12 - sub_bbox[1]), subtitle, font=fonts.subtitle, fill=text_color)
    else:
        title_y = (header_h - title_h) // 2
        draw.text((title_x, title_y - title_bbox[1]), title, font=fonts.title, fill=text_color)

    return header_h


def _draw_promo_banner(img: Image.Image, template: dict, width: int, header_h: int) -> None:
    overlay = Image.new("RGBA", (width, header_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    stripe_color = hex_to_rgba(template["cor_promo_fundo"], 110)
    odraw.polygon(
        [(width * 0.55, 0), (width, 0), (width, header_h), (width * 0.35, header_h)],
        fill=stripe_color,
    )
    header_region = img.crop((0, 0, width, header_h)).convert("RGBA")
    composited = Image.alpha_composite(header_region, overlay).convert("RGB")
    img.paste(composited, (0, 0))


# ─────────────────────────────────────────
# Infos extras (pílulas)
# ─────────────────────────────────────────


def _draw_pills(draw: ImageDraw.ImageDraw, rows: list[list[InfoExtra]], template: dict, fonts: Fonts, width: int, y: int) -> int:
    y += PILL_SECTION_GAP
    for row in rows:
        total_w = sum(pill_width(info, fonts.pill, fonts.icon) for info in row) + PILL_GAP * (len(row) - 1)
        x = (width - total_w) / 2
        for info in row:
            w = pill_width(info, fonts.pill, fonts.icon)
            _draw_single_pill(draw, info, template, fonts, x, y, w)
            x += w + PILL_GAP
        y += PILL_HEIGHT + PILL_GAP
    y += PILL_SECTION_GAP - PILL_GAP
    return y


def _draw_single_pill(draw: ImageDraw.ImageDraw, info: InfoExtra, template: dict, fonts: Fonts, x: float, y: int, w: float) -> None:
    if info.destaque:
        bg = hex_to_rgb(template["cor_promo_fundo"])
        fg = hex_to_rgb(template["cor_promo_texto"])
        border = bg
    else:
        bg = hex_to_rgb(template["cor_info_fundo"])
        fg = hex_to_rgb(template["cor_info_texto"])
        border = hex_to_rgb(template["cor_info_borda"])

    draw.rounded_rectangle((x, y, x + w, y + PILL_HEIGHT), radius=PILL_HEIGHT / 2, fill=bg, outline=border, width=2)

    cursor_x = x + PILL_PADDING_X
    if info.icone:
        glyph = glyph_for(info.icone)
        icon_bbox = draw.textbbox((0, 0), glyph, font=fonts.icon)
        icon_h = icon_bbox[3] - icon_bbox[1]
        draw.text((cursor_x, y + (PILL_HEIGHT - icon_h) / 2 - icon_bbox[1]), glyph, font=fonts.icon, fill=fg)
        cursor_x += fonts.icon.size + 12

    text_bbox = draw.textbbox((0, 0), info.texto, font=fonts.pill)
    text_h = text_bbox[3] - text_bbox[1]
    draw.text((cursor_x, y + (PILL_HEIGHT - text_h) / 2 - text_bbox[1]), info.texto, font=fonts.pill, fill=fg)


def _draw_badge(
    draw: ImageDraw.ImageDraw,
    text: str,
    font,
    ref_x: float,
    ref_y: float,
    bg_color: str,
    fg_color: str,
    anchor: str = "top-right",
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    pad_x, pad_y = 12, 6
    badge_w = (bbox[2] - bbox[0]) + pad_x * 2
    badge_h = (bbox[3] - bbox[1]) + pad_y * 2

    if anchor == "top-right":
        badge_x = ref_x - badge_w - 8
        badge_y = ref_y - badge_h / 2
    else:  # corner: ref_x/ref_y é o canto superior direito do badge
        badge_x = ref_x - badge_w
        badge_y = ref_y

    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
        radius=badge_h / 2,
        fill=hex_to_rgb(bg_color),
    )
    draw.text((badge_x + pad_x, badge_y + pad_y - bbox[1]), text, font=font, fill=hex_to_rgb(fg_color))


# ─────────────────────────────────────────
# Grid de produtos
# ─────────────────────────────────────────


def _category_label_height(fonts: Fonts) -> int:
    return fonts.category.size + 30


def _draw_grid(draw: ImageDraw.ImageDraw, img: Image.Image, grupos: dict[str, list[Produto]], payload, template, fonts: Fonts, width: int, y: int) -> int:
    num_colunas = max(1, payload.num_colunas)
    available_width = width - 2 * MARGIN
    col_width = (available_width - CARD_GAP * (num_colunas - 1)) / num_colunas

    for categoria, produtos in grupos.items():
        cat_bbox = draw.textbbox((0, 0), categoria, font=fonts.category)
        y += 12
        draw.text((MARGIN, y - cat_bbox[1]), categoria, font=fonts.category, fill=hex_to_rgb(template["cor_categoria"]))
        y += (cat_bbox[3] - cat_bbox[1]) + 18

        for idx, produto in enumerate(produtos):
            col = idx % num_colunas
            row = idx // num_colunas
            x = MARGIN + col * (col_width + CARD_GAP)
            card_y = y + row * (CARD_HEIGHT + CARD_GAP)
            _draw_product_card(draw, img, produto, template, fonts, x, card_y, col_width, CARD_HEIGHT)

        rows_count = math.ceil(len(produtos) / num_colunas)
        y += rows_count * (CARD_HEIGHT + CARD_GAP)

    return y


def _draw_product_card(draw: ImageDraw.ImageDraw, img: Image.Image, produto: Produto, template: dict, fonts: Fonts, x: float, y: float, card_w: float, card_h: int) -> None:
    draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=16, fill=hex_to_rgb(template["cor_card"]))

    photo_size = CARD_IMAGE_SIZE
    photo_x = x + CARD_PADDING
    photo_y = y + (card_h - photo_size) / 2

    photo = _circular_photo(produto.imagem_url, photo_size, hex_to_rgb(template["cor_card"]), hex_to_rgb(template["cor_texto"]))
    img.paste(photo, (int(photo_x), int(photo_y)), photo)

    text_x = photo_x + photo_size + CARD_PADDING
    text_w = card_w - (text_x - x) - CARD_PADDING

    # Reserva espaço para o badge de desconto no canto superior direito,
    # senão o nome do produto pode passar por cima dele.
    name_max_w = text_w
    if produto.desconto:
        badge_text = f"-{produto.desconto}%"
        badge_bbox = draw.textbbox((0, 0), badge_text, font=fonts.badge)
        badge_w = (badge_bbox[2] - badge_bbox[0]) + 12 * 2
        name_max_w = max(text_w - badge_w - 12, text_w * 0.4)

    name = truncate_text(produto.nome, fonts.product_name, name_max_w)
    name_bbox = draw.textbbox((0, 0), name, font=fonts.product_name)
    cursor_y = y + CARD_PADDING
    draw.text((text_x, cursor_y - name_bbox[1]), name, font=fonts.product_name, fill=hex_to_rgb(template["cor_texto"]))
    cursor_y += (name_bbox[3] - name_bbox[1]) + 8

    if produto.descricao:
        for line in wrap_text(produto.descricao, fonts.product_desc, text_w, max_lines=2):
            line_bbox = draw.textbbox((0, 0), line, font=fonts.product_desc)
            draw.text((text_x, cursor_y - line_bbox[1]), line, font=fonts.product_desc, fill=hex_to_rgb(template["cor_texto"]))
            cursor_y += (line_bbox[3] - line_bbox[1]) + 6

    _draw_price(draw, produto, template, fonts, text_x, x, y, card_w, card_h)


def _draw_price(draw: ImageDraw.ImageDraw, produto: Produto, template: dict, fonts: Fonts, text_x: float, card_x: float, card_y: float, card_w: float, card_h: int) -> None:
    if produto.desconto:
        original_text = format_price(produto.preco)
        discounted_price = produto.preco * (1 - produto.desconto / 100)
        discounted_text = format_price(discounted_price)

        orig_bbox = draw.textbbox((0, 0), original_text, font=fonts.product_desc)
        orig_h = orig_bbox[3] - orig_bbox[1]
        orig_w = orig_bbox[2] - orig_bbox[0]

        price_y = card_y + card_h - CARD_PADDING - fonts.price.size - orig_h - 4

        draw.text((text_x, price_y - orig_bbox[1]), original_text, font=fonts.product_desc, fill=hex_to_rgb(template["cor_texto"]))
        strike_y = price_y + orig_h / 2
        draw.line((text_x, strike_y, text_x + orig_w, strike_y), fill=hex_to_rgb(template["cor_texto"]), width=2)

        price_y2 = price_y + orig_h + 4
        disc_bbox = draw.textbbox((0, 0), discounted_text, font=fonts.price)
        draw.text((text_x, price_y2 - disc_bbox[1]), discounted_text, font=fonts.price, fill=hex_to_rgb(template["cor_preco"]))

        _draw_badge(
            draw,
            f"-{produto.desconto}%",
            fonts.badge,
            card_x + card_w - 12,
            card_y + 12,
            template["cor_promo_badge"],
            template["cor_promo_badge_texto"],
            anchor="corner",
        )
    else:
        price_text = format_price(produto.preco)
        price_bbox = draw.textbbox((0, 0), price_text, font=fonts.price)
        price_y = card_y + card_h - CARD_PADDING - (price_bbox[3] - price_bbox[1])
        draw.text((text_x, price_y - price_bbox[1]), price_text, font=fonts.price, fill=hex_to_rgb(template["cor_preco"]))


# ─────────────────────────────────────────
# Footer + QR code
# ─────────────────────────────────────────


def _draw_footer(draw: ImageDraw.ImageDraw, img: Image.Image, payload, template, fonts: Fonts, width: int, total_height: int) -> None:
    footer_y = total_height - FOOTER_HEIGHT
    draw.rectangle((0, footer_y, width, total_height), fill=hex_to_rgb(template["cor_rodape"]))

    text_color = hex_to_rgb(template["cor_header_texto"])

    if payload.rodape_texto:
        max_w = width * 0.6 if (payload.incluir_qr and payload.qr_url) else width - 2 * MARGIN
        lines = wrap_text(payload.rodape_texto, fonts.footer, max_w, max_lines=3)
        line_h = fonts.footer.size + 8
        cursor_y = footer_y + (FOOTER_HEIGHT - len(lines) * line_h) / 2
        for line in lines:
            line_bbox = draw.textbbox((0, 0), line, font=fonts.footer)
            draw.text((MARGIN, cursor_y - line_bbox[1]), line, font=fonts.footer, fill=text_color)
            cursor_y += line_h

    if payload.incluir_qr and payload.qr_url:
        _draw_qr(img, draw, payload, fonts, width, footer_y, text_color)


def _draw_qr(img: Image.Image, draw: ImageDraw.ImageDraw, payload, fonts: Fonts, width: int, footer_y: int, text_color: TextColor) -> None:
    qr = qrcode.QRCode(border=1, box_size=4)
    qr.add_data(payload.qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA").resize((QR_SIZE, QR_SIZE))

    bg_size = QR_SIZE + QR_PADDING * 2
    bg = Image.new("RGBA", (bg_size, bg_size), (255, 255, 255, 255))
    ImageDraw.Draw(bg).rounded_rectangle((0, 0, bg_size, bg_size), radius=12, fill=(255, 255, 255, 255))
    bg.paste(qr_img, (QR_PADDING, QR_PADDING))

    # Legenda em até 2 linhas (não trunca), centralizada sob o QR.
    legend_lines: list[str] = []
    line_h = fonts.product_desc.size + 2
    if payload.qr_legenda:
        legend_lines = wrap_text(payload.qr_legenda, fonts.product_desc, bg_size + 80, max_lines=2)

    block_h = bg_size + (6 + len(legend_lines) * line_h if legend_lines else 0)
    qr_x = width - MARGIN - bg_size
    block_top = footer_y + (FOOTER_HEIGHT - block_h) / 2
    img.paste(bg, (int(qr_x), int(block_top)))

    cursor_y = block_top + bg_size + 6
    for line in legend_lines:
        lb = draw.textbbox((0, 0), line, font=fonts.product_desc)
        lx = qr_x + (bg_size - (lb[2] - lb[0])) / 2
        draw.text((lx, cursor_y - lb[1]), line, font=fonts.product_desc, fill=text_color)
        cursor_y += line_h
