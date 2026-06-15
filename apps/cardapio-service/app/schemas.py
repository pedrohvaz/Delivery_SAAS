from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Produto(BaseModel):
    nome: str
    descricao: str = ""
    preco: float
    categoria: str = "Outros"
    desconto: Optional[int] = Field(default=None, ge=1, le=99)
    imagem_url: Optional[str] = None


class InfoExtra(BaseModel):
    texto: str
    icone: str = ""
    posicao: Literal["topo", "rodape"] = "topo"
    destaque: bool = False


class ConfigIA(BaseModel):
    tipo_estabelecimento: str = ""
    estilo: str = ""
    paleta_cores: str = ""
    descricao_visual: str = ""
    qualidade: Literal["standard", "hd"] = "standard"
    blur_fundo: int = 0
    overlay_opacidade: float = 0.0


class CardapioRequest(BaseModel):
    modo: Literal["manual", "ia_fundo", "ia_completo"] = "manual"

    titulo: str
    subtitulo: str = ""
    rodape_texto: str = ""

    template_key: Optional[str] = None
    template_customizado: Optional[Dict[str, Any]] = None

    incluir_logo: bool = False
    logo_url: Optional[str] = None
    logo_tamanho: int = 80

    incluir_qr: bool = False
    qr_url: Optional[str] = None
    qr_legenda: str = ""

    infos_extras: List[InfoExtra] = Field(default_factory=list)
    produtos: List[Produto] = Field(default_factory=list)

    config_ia: Optional[ConfigIA] = None

    largura: int = 1080
    num_colunas: int = 2
    nome_arquivo: Optional[str] = None
