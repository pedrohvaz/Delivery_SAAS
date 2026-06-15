"""Mapeia os emojis do seletor do admin para glyphs do Font Awesome Free (Solid).

Renderizar os icones via fonte (em vez de PNGs do Twemoji) permite tingir o
icone com a cor do template (`cor_info_texto`, `cor_promo_texto` etc.) e
funciona de forma identica no Windows (dev) e no Linux (Railway), ja que a
fonte e bundlada em app/assets/fonts/fa-solid-900.ttf.

A mesma lista de emojis (chaves deste dict) deve ser usada no seletor do
admin (apps/web-admin/src/components/cardapio-gerador/emoji-picker.tsx).
"""

from __future__ import annotations

EMOJI_TO_GLYPH: dict[str, str] = {
    '🔥': "\uf06d",  # fire
    '🚚': "\uf0d1",  # truck
    '🛵': "\uf21c",  # motorcycle
    '⏰': "\uf017",  # clock
    '📍': "\uf3c5",  # location-dot
    '📞': "\uf095",  # phone
    '⭐': "\uf005",  # star
    '🎁': "\uf06b",  # gift
    '❤': "\uf004",  # heart
    '🍕': "\uf818",  # pizza-slice
    '🍔': "\uf805",  # burger
    '☕': "\uf7b6",  # mug-hot
    '🎂': "\uf1fd",  # cake-candles
    '🍦': "\uf810",  # ice-cream
    '💳': "\uf09d",  # credit-card
    '📦': "\uf466",  # box
    '✅': "\uf058",  # circle-check
    '🏆': "\uf091",  # trophy
    '🔔': "\uf0f3",  # bell
    '💰': "\uf81d",  # sack-dollar
    '💵': "\uf53a",  # money-bill-wave
    '🍗': "\uf6d7",  # drumstick-bite
    '🏷': "\uf02b",  # tag
    '👍': "\uf164",  # thumbs-up
    '⚡': "\uf0e7",  # bolt
    '🌿': "\uf06c",  # leaf
    '🍵': "\uf0f4",  # mug-saucer
    '🌶': "\uf816",  # pepper-hot
    '🐟': "\uf578",  # fish
    '🥕': "\uf787",  # carrot
}

DEFAULT_GLYPH = ""  # star (fallback)


def glyph_for(emoji: str) -> str:
    return EMOJI_TO_GLYPH.get(emoji.strip(), DEFAULT_GLYPH)
