from dotenv import load_dotenv
from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

load_dotenv()

from . import ai
from .renderer import render, resize_to_width
from .schemas import CardapioRequest
from .templates import resolve_template

app = FastAPI(title="Cardápio em Imagem", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/gerar-cardapio")
def gerar_cardapio(payload: CardapioRequest):
    try:
        if payload.template_key or payload.template_customizado:
            template = resolve_template(payload.template_key, payload.template_customizado)
        elif payload.modo != "manual" and payload.config_ia:
            template = resolve_template(ai.sugerir_template(payload.config_ia), None)
        else:
            template = resolve_template(payload.template_key, payload.template_customizado)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"error": "template_invalido", "detail": str(exc)})

    try:
        if payload.modo == "manual":
            png_bytes = render(payload, template, background=None)
        elif payload.modo == "ia_fundo":
            if payload.config_ia is None:
                return JSONResponse(status_code=400, content={"error": "config_ia_obrigatorio", "detail": "Informe 'config_ia' para o modo 'ia_fundo'."})
            payload.produtos = ai.preencher_descricoes(payload.produtos)
            background = ai.gerar_fundo_dalle(payload.config_ia)
            png_bytes = render(payload, template, background=background)
        elif payload.modo == "ia_completo":
            if payload.config_ia is None:
                return JSONResponse(status_code=400, content={"error": "config_ia_obrigatorio", "detail": "Informe 'config_ia' para o modo 'ia_completo'."})
            imagem = ai.gerar_cardapio_completo_dalle(payload)
            png_bytes = resize_to_width(imagem, payload.largura)
        else:
            return JSONResponse(status_code=400, content={"error": "modo_invalido", "detail": f"Modo '{payload.modo}' inválido."})
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": "erro_geracao", "detail": str(exc)})

    return Response(content=png_bytes, media_type="image/png")
