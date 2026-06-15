export interface WizardProduto {
  id: string
  nome: string
  descricao: string
  preco: number
  categoria: string
  imagem_url?: string | null
  selected: boolean
  desconto?: number
  isCustom?: boolean
}

export interface WizardInfoExtra {
  id: string
  texto: string
  icone: string
  posicao: 'topo' | 'rodape'
  destaque: boolean
}

export interface CardapioWizardState {
  step: 1 | 2 | 3 | 4 | 5
  produtos: WizardProduto[]
  templateKey: string | null
  templateCustomizado: Record<string, unknown> | null
  titulo: string
  subtitulo: string
  rodapeTexto: string
  incluirLogo: boolean
  logoUrl: string | null
  logoTamanho: number
  incluirQr: boolean
  qrUrl: string
  qrLegenda: string
  infosExtras: WizardInfoExtra[]
  modo: 'manual' | 'ia_fundo' | 'ia_completo'
  configIa: {
    tipoEstabelecimento: string
    estilo: string
    paletaCores: string
    descricaoVisual: string
    qualidade: 'standard' | 'hd'
  }
  largura: number
  numColunas: number
  resultImageUrl: string | null
  generating: boolean
  error: string | null
}

export const INITIAL_WIZARD_STATE: CardapioWizardState = {
  step: 1,
  produtos: [],
  templateKey: null,
  templateCustomizado: null,
  titulo: '',
  subtitulo: '',
  rodapeTexto: '',
  incluirLogo: false,
  logoUrl: null,
  logoTamanho: 80,
  incluirQr: false,
  qrUrl: '',
  qrLegenda: 'Peça pelo nosso cardápio online',
  infosExtras: [],
  modo: 'manual',
  configIa: {
    tipoEstabelecimento: '',
    estilo: '',
    paletaCores: '',
    descricaoVisual: '',
    qualidade: 'standard',
  },
  largura: 1080,
  numColunas: 2,
  resultImageUrl: null,
  generating: false,
  error: null,
}
