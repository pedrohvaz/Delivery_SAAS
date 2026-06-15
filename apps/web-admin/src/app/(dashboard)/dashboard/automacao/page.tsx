'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { useAuthStore } from '@/store/auth'
import {
  useAutomationConfig, useUpdateAutomationConfig,
  useConversations, useConversation, useCloseConversation,
  useTestAutomation,
  useWhatsappStatus, useWhatsappConnect, useWhatsappDisconnect,
} from '@/hooks/use-automation'
import {
  Zap, Bot, MessageSquare, Copy, Check, ChevronDown, ChevronUp,
  X, Send, Loader2, Phone, Clock, CheckCircle, XCircle, Smartphone, QrCode,
} from 'lucide-react'
import { cn } from '@delivery/ui'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const AI_PROVIDERS = [
  { value: 'claude', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'openrouter', label: 'OpenRouter (vários modelos)' },
]

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku — Rápido e econômico (recomendado)' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet — Mais inteligente' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o — Equilibrado (recomendado)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — Rápido e econômico' },
  ],
  openrouter: [
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini — Rápido e econômico (recomendado)' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ],
}

const AI_KEY_INFO: Record<string, { label: string; placeholder: string; url: string }> = {
  claude: { label: 'Chave da API Anthropic', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com' },
  openai: { label: 'Chave da API OpenAI', placeholder: 'sk-...', url: 'https://platform.openai.com/api-keys' },
  openrouter: { label: 'Chave da API OpenRouter', placeholder: 'sk-or-...', url: 'https://openrouter.ai/keys' },
}

// ─── Conexão do WhatsApp (provisionamento da instância da loja) ─────────────────

function WhatsappConnectionCard() {
  const { data: status } = useWhatsappStatus()
  const connect = useWhatsappConnect()
  const disconnect = useWhatsappDisconnect()
  const [qr, setQr] = useState<string | null>(null)
  const [pairing, setPairing] = useState<string | null>(null)
  const [error, setError] = useState('')

  const state = status?.state ?? 'disconnected'
  const connected = state === 'open'

  useEffect(() => {
    if (connected) { setQr(null); setPairing(null) }
  }, [connected])

  async function handleConnect() {
    setError('')
    try {
      const r = await connect.mutateAsync()
      if (r.state === 'open') { setQr(null); setPairing(null) }
      else { setQr(r.qrcode); setPairing(r.pairingCode) }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Falha ao conectar com o servidor de WhatsApp.')
    }
  }

  async function handleDisconnect() {
    setError('')
    await disconnect.mutateAsync()
    setQr(null); setPairing(null)
  }

  const badge = connected
    ? { label: 'Conectado', cls: 'bg-green-100 text-green-700' }
    : state === 'connecting'
      ? { label: 'Conectando…', cls: 'bg-yellow-100 text-yellow-700' }
      : { label: 'Desconectado', cls: 'bg-muted text-muted-foreground' }

  return (
    <section className="bg-card border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Conexão do WhatsApp</h2>
            <p className="text-xs text-muted-foreground">Conecte o número da loja para o atendente responder no WhatsApp</p>
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium', badge.cls)}>{badge.label}</span>
      </div>

      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={disconnect.isPending}
          className="rounded-xl border px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          {disconnect.isPending ? 'Desconectando…' : 'Desconectar WhatsApp'}
        </button>
      ) : qr ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code do WhatsApp"
            className="h-56 w-56 rounded-xl border bg-white p-2"
          />
          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> e escaneie o código.
          </p>
          {pairing && <p className="text-sm">Ou use o código: <span className="font-mono font-bold">{pairing}</span></p>}
          <button onClick={handleConnect} disabled={connect.isPending} className="text-xs text-primary hover:underline">
            Gerar novo código
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connect.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
        >
          {connect.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando QR…</> : <><QrCode className="h-4 w-4" /> Conectar WhatsApp</>}
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}

// ─── Painel de conversa ───────────────────────────────────────────────────────

function ConversationPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: conv, isLoading } = useConversation(id)
  const closeConv = useCloseConversation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages.length])

  return (
    <div className="flex flex-col h-full border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {(conv?.customerName ?? conv?.customerPhone ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{conv?.customerName ?? conv?.customerPhone}</p>
            {conv?.customerName && <p className="text-xs text-muted-foreground">{conv.customerPhone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {conv?.status === 'ACTIVE' && (
            <button
              onClick={async () => { await closeConv.mutateAsync(id); onClose() }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition"
            >
              <XCircle className="h-3.5 w-3.5" /> Encerrar
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <div className="text-center text-muted-foreground text-sm py-8">Carregando...</div>}
        {conv?.messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
            <div className={cn(
              'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
              msg.role === 'user'
                ? 'bg-muted text-foreground rounded-tl-sm'
                : 'bg-primary text-primary-foreground rounded-tr-sm',
            )}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                {format(new Date(msg.createdAt), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        {conv?.messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground text-sm py-8">Nenhuma mensagem ainda.</div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AutomacaoPage() {
  const { store } = useAuthStore()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
  const webhookUrl = `${apiUrl}/automation/webhook/${store?.slug ?? ''}`

  const { data: config, isLoading: configLoading } = useAutomationConfig()
  const updateConfig = useUpdateAutomationConfig()
  const { data: convsData, isLoading: convsLoading } = useConversations(1)
  const testAI = useTestAutomation()

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form config
  const [aiProvider, setAiProvider] = useState('claude')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('claude-haiku-4-5-20251001')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [closedMessage, setClosedMessage] = useState('')
  const [configSaved, setConfigSaved] = useState(false)

  // Teste
  const [testMsg, setTestMsg] = useState('')
  const [testResponse, setTestResponse] = useState('')

  useEffect(() => {
    if (config) {
      setAiProvider(config.aiProvider || 'claude')
      setAiModel(config.aiModel)
      setSystemPrompt(config.systemPrompt ?? '')
      setClosedMessage(config.closedMessage ?? '')
      setAiApiKey(config.aiApiKey ?? '')
    }
  }, [config])

  function handleProviderChange(provider: string) {
    setAiProvider(provider)
    const models = AI_MODELS[provider] ?? []
    if (!models.some((m) => m.value === aiModel)) setAiModel(models[0]?.value ?? '')
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleToggle() {
    await updateConfig.mutateAsync({ isEnabled: !config?.isEnabled })
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    await updateConfig.mutateAsync({ aiProvider, aiApiKey, aiModel, systemPrompt, closedMessage })
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 3000)
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testMsg.trim()) return
    setTestResponse('')
    try {
      const result = await testAI.mutateAsync(testMsg)
      setTestResponse(result.response)
    } catch (err: any) {
      setTestResponse(`Erro: ${err?.response?.data?.message ?? 'Falha na IA'}`)
    }
  }

  const conversations = convsData?.data ?? []
  const todayConvs = conversations.filter((c) => {
    const today = new Date()
    const convDate = new Date(c.createdAt)
    return convDate.toDateString() === today.toDateString()
  }).length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Automação" />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">

          {/* ① Toggle principal */}
          <div className="bg-card border rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', config?.isEnabled ? 'bg-green-100' : 'bg-muted')}>
                <Bot className={cn('h-6 w-6', config?.isEnabled ? 'text-green-600' : 'text-muted-foreground')} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Atendente IA</h2>
                <p className="text-sm text-muted-foreground">
                  {config?.isEnabled
                    ? `Ativo · ${todayConvs} conversa${todayConvs !== 1 ? 's' : ''} hoje`
                    : 'Inativo — configure e ative para começar'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={updateConfig.isPending || configLoading}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors duration-200',
                config?.isEnabled ? 'bg-green-500' : 'bg-muted-foreground/30',
              )}
            >
              <span className={cn(
                'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
                config?.isEnabled ? 'translate-x-5.5' : 'translate-x-0.5',
              )} style={{ transform: config?.isEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {/* ② Conexão do WhatsApp */}
          <WhatsappConnectionCard />

          {/* ③ Configuração da IA */}
          <section className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Configuração da IA</h2>
                <p className="text-xs text-muted-foreground">Configure o modelo e a personalidade do atendente</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Provedor de IA</label>
                <select
                  value={aiProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Modelo de IA</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(AI_MODELS[aiProvider] ?? []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {AI_KEY_INFO[aiProvider]?.label ?? 'Chave da API'} <span className="text-muted-foreground font-normal">(opcional)</span>
                  <a href={AI_KEY_INFO[aiProvider]?.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-xs text-primary hover:underline">Obter chave →</a>
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={AI_KEY_INFO[aiProvider]?.placeholder ?? 'sk-...'}
                  className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">Deixe em branco para usar a chave da plataforma (incluída no seu plano).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Personalidade do Atendente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  placeholder="Ex: Seja bem simpático, sempre ofereça sobremesas no final, use o nome do cliente, mencione promoções especiais de fim de semana..."
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Mensagem quando a loja está fechada <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={closedMessage}
                  onChange={(e) => setClosedMessage(e.target.value)}
                  rows={3}
                  placeholder="Deixe vazio para a mensagem automática (com horários e próxima abertura). Ex: Tô descansando 😴 Voltamos {proxima_abertura}! Veja o cardápio: {cardapio}"
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: <code>{'{horarios}'}</code>, <code>{'{proxima_abertura}'}</code>, <code>{'{cardapio}'}</code>.
                </p>
              </div>

              <button type="submit" disabled={updateConfig.isPending}
                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                {configSaved ? <><Check className="h-4 w-4" /> Salvo!</> : updateConfig.isPending ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </form>
          </section>

          {/* ③ Teste da IA */}
          <section className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Testar Atendente</h2>
                <p className="text-xs text-muted-foreground">Simule uma mensagem de cliente para ver como a IA responde</p>
              </div>
            </div>

            <form onSubmit={handleTest} className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  placeholder="Ex: Oi, qual o cardápio de hoje?"
                  className="flex-1 h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" disabled={testAI.isPending || !testMsg.trim()}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
                  {testAI.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              {testResponse && (
                <div className="rounded-xl bg-muted/50 border p-3 text-sm whitespace-pre-wrap text-foreground">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">Resposta da IA:</p>
                  {testResponse}
                </div>
              )}
            </form>
          </section>

          {/* ④ Guia de Configuração */}
          <section className="bg-card border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">?</span>
                </div>
                <span className="text-sm font-semibold text-foreground">Como configurar o atendente</span>
              </div>
              {showGuide ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showGuide && (
              <div className="px-5 pb-5 space-y-4 border-t pt-4">
                {[
                  {
                    step: '1', title: 'Configure a Evolution API',
                    desc: 'Vá em Configurações → WhatsApp e preencha a URL, chave e instância da Evolution API.',
                    action: <a href="/dashboard/configuracoes" className="text-xs text-primary hover:underline">Ir para Configurações →</a>,
                  },
                  {
                    step: '2', title: 'Adicione a chave da IA',
                    desc: 'Obtenha uma chave em console.anthropic.com e cole no campo acima.',
                  },
                  {
                    step: '3', title: 'Configure o Webhook na Evolution API',
                    desc: 'No painel da Evolution API, configure a URL de webhook abaixo para receber mensagens:',
                    action: (
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono break-all">{webhookUrl}</code>
                        <button onClick={copyWebhook}
                          className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium hover:bg-muted transition">
                          {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copiado!</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
                        </button>
                      </div>
                    ),
                  },
                  {
                    step: '4', title: 'Ative o Atendente',
                    desc: 'Use o toggle no topo desta página para ativar o atendente.',
                  },
                ].map(({ step, title, desc, action }) => (
                  <div key={step} className="flex gap-3">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      {action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ⑤ Monitor de conversas */}
        <div className={cn('flex flex-col border-l bg-white', selectedConvId ? 'w-96' : 'w-80')}>
          {selectedConvId ? (
            <ConversationPanel id={selectedConvId} onClose={() => setSelectedConvId(null)} />
          ) : (
            <>
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-foreground">Monitor de Conversas</h3>
                <p className="text-xs text-muted-foreground">{convsData?.total ?? 0} no total</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convsLoading && (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
                  </div>
                )}
                {!convsLoading && conversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                    <p className="text-xs text-muted-foreground">As conversas aparecerão aqui quando clientes enviarem mensagens</p>
                  </div>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 border-b hover:bg-muted/30 transition text-left"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(conv.customerName ?? conv.customerPhone)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {conv.customerName ?? conv.customerPhone}
                        </p>
                        <span className={cn('shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          conv.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                          {conv.status === 'ACTIVE' ? '● Ativa' : '○ Encerrada'}
                        </span>
                      </div>
                      {conv.messages[0] && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.messages[0].content}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
