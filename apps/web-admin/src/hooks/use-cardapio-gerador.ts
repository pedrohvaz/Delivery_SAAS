import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CardapioTemplate {
  key: string
  cor_fundo: string
  cor_card: string
  cor_destaque: string
  cor_texto: string
  cor_preco: string
  cor_categoria: string
  cor_rodape: string
  cor_header_texto: string
  cor_info_fundo: string
  cor_info_texto: string
  cor_info_borda: string
  cor_promo_fundo: string
  cor_promo_texto: string
  cor_promo_badge: string
  cor_promo_badge_texto: string
  is_promocao: boolean
}

export type ValidarTemplateResult = { valido: true } | { valido: false; faltando: string[] }

export interface GerarCardapioPayload {
  modo: 'manual' | 'ia_fundo' | 'ia_completo'
  titulo: string
  subtitulo?: string
  rodape_texto?: string
  template_key?: string
  template_customizado?: Record<string, unknown>
  incluir_logo?: boolean
  logo_url?: string | null
  logo_tamanho?: number
  incluir_qr?: boolean
  qr_url?: string
  qr_legenda?: string
  infos_extras?: { texto: string; icone: string; posicao: 'topo' | 'rodape'; destaque: boolean }[]
  produtos: {
    nome: string
    descricao?: string
    preco: number
    categoria?: string
    desconto?: number
    imagem_url?: string | null
  }[]
  config_ia?: {
    tipo_estabelecimento?: string
    estilo?: string
    paleta_cores?: string
    descricao_visual?: string
    qualidade?: 'standard' | 'hd'
  }
  largura?: number
  num_colunas?: number
}

export interface GerarCardapioResult {
  imageUrl: string
  id: string
  modo: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useCardapioTemplates() {
  return useQuery({
    queryKey: ['cardapio-templates'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CardapioTemplate[] }>('/cardapio/templates')
      return data.data
    },
  })
}

export function useValidarTemplate() {
  return useMutation({
    mutationFn: (template: Record<string, unknown>) =>
      api.post<{ data: ValidarTemplateResult }>('/cardapio/template/validar', { template }).then((r) => r.data.data),
  })
}

export function useGerarCardapio() {
  return useMutation({
    mutationFn: (payload: GerarCardapioPayload) =>
      api.post<{ data: GerarCardapioResult }>('/cardapio/gerar', payload).then((r) => r.data.data),
  })
}
