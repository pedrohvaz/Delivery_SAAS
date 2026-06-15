'use client'

import { useEffect, useState } from 'react'
import { Loader2, Download, RefreshCcw, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGerarCardapio, type GerarCardapioPayload } from '@/hooks/use-cardapio-gerador'
import type { CardapioWizardState } from './wizard-state'

interface StepRevisaoProps {
  state: CardapioWizardState
  update: (patch: Partial<CardapioWizardState>) => void
}

const MENSAGENS_MANUAL = [
  'Organizando os produtos por categoria...',
  'Montando o layout do cardápio...',
  'Aplicando as cores do template...',
  'Quase lá...',
]

const MENSAGENS_IA = [
  'Gerando a arte com inteligência artificial...',
  'Isso pode levar até um minuto...',
  'Criando algo único para a sua loja...',
  'Aplicando os últimos retoques...',
]

const MODO_LABEL: Record<CardapioWizardState['modo'], string> = {
  manual: 'Manual',
  ia_fundo: 'Fundo com IA',
  ia_completo: 'Cardápio completo com IA',
}

export function StepRevisao({ state, update }: StepRevisaoProps) {
  const gerarCardapio = useGerarCardapio()
  const [messageIndex, setMessageIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const messages = state.modo === 'manual' ? MENSAGENS_MANUAL : MENSAGENS_IA
  const selectedProdutos = state.produtos.filter((p) => p.selected)

  useEffect(() => {
    if (!state.generating) {
      setMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [state.generating, messages.length])

  async function handleGerar() {
    update({ generating: true, error: null })

    const payload: GerarCardapioPayload = {
      modo: state.modo,
      titulo: state.titulo,
      subtitulo: state.subtitulo,
      rodape_texto: state.rodapeTexto,
      ...(state.templateCustomizado
        ? { template_customizado: state.templateCustomizado }
        : { template_key: state.templateKey ?? undefined }),
      incluir_logo: state.incluirLogo,
      logo_url: state.logoUrl,
      logo_tamanho: state.logoTamanho,
      incluir_qr: state.incluirQr,
      qr_url: state.qrUrl,
      qr_legenda: state.qrLegenda,
      infos_extras: state.infosExtras.map(({ texto, icone, posicao, destaque }) => ({ texto, icone, posicao, destaque })),
      produtos: selectedProdutos.map(({ nome, descricao, preco, categoria, desconto, imagem_url }) => ({
        nome,
        descricao,
        preco,
        categoria,
        desconto,
        imagem_url,
      })),
      ...(state.modo !== 'manual'
        ? {
            config_ia: {
              tipo_estabelecimento: state.configIa.tipoEstabelecimento,
              estilo: state.configIa.estilo,
              paleta_cores: state.configIa.paletaCores,
              descricao_visual: state.configIa.descricaoVisual,
              qualidade: state.configIa.qualidade,
            },
          }
        : {}),
      largura: state.largura,
      num_colunas: state.numColunas,
    }

    try {
      const result = await gerarCardapio.mutateAsync(payload)
      update({ resultImageUrl: result.imageUrl, generating: false })
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Não foi possível gerar a imagem do cardápio. Tente novamente.'
      update({ error: message, generating: false })
    }
  }

  function handleGerarNovamente() {
    update({ resultImageUrl: null, error: null })
  }

  async function handleCompartilhar() {
    if (!state.resultImageUrl) return
    await navigator.clipboard.writeText(state.resultImageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.resultImageUrl) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Cardápio gerado!</h3>
          <p className="text-sm text-muted-foreground">Baixe a imagem ou compartilhe o link.</p>
        </div>
        <div className="flex justify-center rounded-xl border bg-muted/30 p-4">
          <img src={state.resultImageUrl} alt="Cardápio gerado" className="max-h-[480px] rounded-lg shadow" />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={state.resultImageUrl}
            download
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Baixar imagem
          </a>
          <Button type="button" variant="secondary" onClick={handleCompartilhar}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Share2 className="mr-1.5 h-4 w-4" />}
            {copied ? 'Link copiado!' : 'Compartilhar'}
          </Button>
          <Button type="button" variant="ghost" onClick={handleGerarNovamente}>
            <RefreshCcw className="mr-1.5 h-4 w-4" /> Gerar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Revisão</h3>
        <p className="text-sm text-muted-foreground">Confira as informações antes de gerar a imagem.</p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Produtos selecionados</span>
          <span className="font-medium">{selectedProdutos.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Template</span>
          <span className="font-medium">{state.templateCustomizado ? 'Customizado' : state.templateKey ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Título</span>
          <span className="font-medium">{state.titulo || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Logo</span>
          <span className="font-medium">{state.incluirLogo ? 'Sim' : 'Não'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">QR Code</span>
          <span className="font-medium">{state.incluirQr ? 'Sim' : 'Não'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Informações extras</span>
          <span className="font-medium">{state.infosExtras.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Modo</span>
          <span className="font-medium">{MODO_LABEL[state.modo]}</span>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={state.generating || selectedProdutos.length === 0}
        onClick={handleGerar}
      >
        {state.generating ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {messages[messageIndex]}
          </span>
        ) : (
          'Gerar Cardápio'
        )}
      </Button>
    </div>
  )
}
