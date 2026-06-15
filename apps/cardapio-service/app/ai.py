import json
from io import BytesIO
from typing import Optional

import requests
from openai import OpenAI
from PIL import Image

from .schemas import CardapioRequest, ConfigIA, Produto
from .templates import TEMPLATES

_client: Optional[OpenAI] = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def _download_image(url: str) -> Image.Image:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return Image.open(BytesIO(response.content))


# ─────────────────────────────────────────
# Fundo gerado por IA (modo ia_fundo)
# ─────────────────────────────────────────


def gerar_fundo_dalle(config_ia: ConfigIA) -> Image.Image:
    partes = ["Imagem de fundo decorativa para um cardápio digital"]
    if config_ia.tipo_estabelecimento:
        partes.append(f"de um(a) {config_ia.tipo_estabelecimento}")
    if config_ia.estilo:
        partes.append(f"com estilo {config_ia.estilo}")
    if config_ia.paleta_cores:
        partes.append(f"usando a paleta de cores {config_ia.paleta_cores}")
    if config_ia.descricao_visual:
        partes.append(config_ia.descricao_visual)
    partes.append("sem texto, sem letras, sem números, sem pessoas, sem logotipos")
    prompt = ", ".join(partes) + "."

    client = get_client()
    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1792",
        quality=config_ia.qualidade,
        n=1,
    )
    return _download_image(response.data[0].url)


# ─────────────────────────────────────────
# Sugestão de template (modo ia_fundo, sem template informado)
# ─────────────────────────────────────────


def sugerir_template(config_ia: ConfigIA) -> str:
    chaves = list(TEMPLATES.keys())
    prompt = (
        "Você é um designer especialista em identidade visual de cardápios. "
        "Escolha o template mais adequado para o estabelecimento descrito abaixo, "
        "respondendo APENAS com a chave exata de uma das opções (sem aspas, sem explicação).\n\n"
        f"Opções: {', '.join(chaves)}\n\n"
        f"Tipo de estabelecimento: {config_ia.tipo_estabelecimento or 'não informado'}\n"
        f"Estilo desejado: {config_ia.estilo or 'não informado'}\n"
        f"Paleta de cores: {config_ia.paleta_cores or 'não informado'}\n"
        f"Descrição visual: {config_ia.descricao_visual or 'não informado'}"
    )

    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=20,
        )
        escolha = (response.choices[0].message.content or "").strip().strip('"').strip("'").lower()
    except Exception:
        return "dark_red"

    return escolha if escolha in TEMPLATES else "dark_red"


# ─────────────────────────────────────────
# Preenchimento de descrições vazias (modo ia_fundo)
# ─────────────────────────────────────────


def preencher_descricoes(produtos: list[Produto]) -> list[Produto]:
    pendentes = [p for p in produtos if len(p.descricao.strip()) < 10]
    if not pendentes:
        return produtos

    prompt = (
        "Você é um redator de cardápios. Para cada item abaixo, escreva uma descrição curta "
        "(máximo 12 palavras), apetitosa, em português do Brasil, sem repetir o nome do item. "
        'Responda APENAS com um JSON no formato {"Nome do item": "descrição"}.\n\n'
        "Itens:\n" + "\n".join(f"- {p.nome} (categoria: {p.categoria})" for p in pendentes)
    )

    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        descricoes = json.loads(response.choices[0].message.content or "{}")
    except Exception:
        descricoes = {}

    for produto in pendentes:
        nova = descricoes.get(produto.nome)
        if nova:
            produto.descricao = str(nova).strip()

    return produtos


# ─────────────────────────────────────────
# Cardápio completo gerado por IA (modo ia_completo)
# ─────────────────────────────────────────


def gerar_cardapio_completo_dalle(payload: CardapioRequest) -> Image.Image:
    linhas = [f"Cardápio digital completo e ilustrado para '{payload.titulo}'."]
    if payload.subtitulo:
        linhas.append(payload.subtitulo)

    config_ia = payload.config_ia
    qualidade = "standard"
    if config_ia:
        qualidade = config_ia.qualidade
        if config_ia.tipo_estabelecimento:
            linhas.append(f"Tipo de estabelecimento: {config_ia.tipo_estabelecimento}.")
        if config_ia.estilo:
            linhas.append(f"Estilo visual: {config_ia.estilo}.")
        if config_ia.paleta_cores:
            linhas.append(f"Paleta de cores: {config_ia.paleta_cores}.")
        if config_ia.descricao_visual:
            linhas.append(config_ia.descricao_visual)

    produtos_por_categoria: dict[str, list[Produto]] = {}
    for produto in payload.produtos:
        produtos_por_categoria.setdefault(produto.categoria, []).append(produto)

    for categoria, produtos in produtos_por_categoria.items():
        linhas.append(f"\nCategoria {categoria}:")
        for produto in produtos:
            preco = f"R$ {produto.preco:.2f}".replace(".", ",")
            linhas.append(f"- {produto.nome}: {preco}")

    linhas.append(
        "\nGere uma imagem de cardápio pronta para divulgação, com o título, todas as "
        "categorias, itens e preços listados de forma legível, em português do Brasil, "
        "com tipografia clara e design profissional."
    )
    prompt = "\n".join(linhas)

    client = get_client()
    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1792",
        quality=qualidade,
        n=1,
    )
    return _download_image(response.data[0].url)
