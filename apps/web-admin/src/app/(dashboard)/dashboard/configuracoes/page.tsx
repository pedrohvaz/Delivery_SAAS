'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Zap, Plus, Trash2, Check, X, MessageCircle, Palette, LayoutGrid, AlignJustify, ExternalLink, Building2, Bell, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  useSettings, useUpdateSettings, useTogglePaymentMethod,
  useCreatePaymentMethod, useDeletePaymentMethod,
  useStoreInfo, useUpdateStoreInfo,
} from '@/hooks/use-settings'

const PAYMENT_TYPE_OPTIONS = [
  { type: 'PIX',         label: 'Pix',               emoji: '💲' },
  { type: 'CASH',        label: 'Dinheiro',           emoji: '💵' },
  { type: 'CREDIT_CARD', label: 'Cartão de Crédito',  emoji: '💳' },
  { type: 'DEBIT_CARD',  label: 'Cartão de Débito',   emoji: '💳' },
  { type: 'PICPAY',      label: 'PicPay',             emoji: '📱' },
]

type TabKey = 'loja' | 'pagamentos' | 'aparencia' | 'notificacoes' | 'marketing'

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: 'loja', label: 'Loja', icon: Building2 },
  { key: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
  { key: 'marketing', label: 'Marketing', icon: BarChart3 },
]

export default function ConfiguracoesPage() {
  const { data: settings, isLoading } = useSettings()
  const { data: storeInfo } = useStoreInfo()
  const updateStoreInfo = useUpdateStoreInfo()

  const [activeTab, setActiveTab] = useState<TabKey>('loja')

  // Dados da loja
  const [storeName, setStoreName] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeWhatsapp, setStoreWhatsapp] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storeNumber, setStoreNumber] = useState('')
  const [storeDistrict, setStoreDistrict] = useState('')
  const [storeCity, setStoreCity] = useState('')
  const [storeState, setStoreState] = useState('')
  const [storeZipCode, setStoreZipCode] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeInstagram, setStoreInstagram] = useState('')
  const [storeFacebook, setStoreFacebook] = useState('')
  const [storeInfoSaved, setStoreInfoSaved] = useState(false)
  const [storeInfoError, setStoreInfoError] = useState('')
  const [asaasError, setAsaasError] = useState('')

  const updateSettings = useUpdateSettings()
  const togglePm = useTogglePaymentMethod()
  const createPm = useCreatePaymentMethod()
  const deletePm = useDeletePaymentMethod()

  // Formulário Asaas
  const [asaasKey, setAsaasKey] = useState('')
  const [asaasSandbox, setAsaasSandbox] = useState(true)
  const [asaasSuccess, setAsaasSuccess] = useState(false)

  // Formulário Mercado Pago
  const [mpToken, setMpToken] = useState('')   // nunca inicializar com o valor mascarado
  const [mpKey, setMpKey] = useState('')
  const [mpSandbox, setMpSandbox] = useState(true)
  const [mpSuccess, setMpSuccess] = useState(false)
  const [mpError, setMpError] = useState('')

  // Formulário Evolution API
  const [evolutionUrl, setEvolutionUrl] = useState('')
  const [evolutionKey, setEvolutionKey] = useState('')
  const [evolutionInstance, setEvolutionInstance] = useState('')
  const [evolutionSuccess, setEvolutionSuccess] = useState(false)
  const [evolutionError, setEvolutionError] = useState('')

  // Aparência
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'list'>('grid')
  const [bannerUrl, setBannerUrl] = useState('')
  const [appearanceSuccess, setAppearanceSuccess] = useState(false)
  const [appearanceError, setAppearanceError] = useState('')

  const { store } = useAuthStore()

  useEffect(() => {
    if (settings) {
      setEvolutionUrl(settings.evolutionApiUrl ?? '')
      setEvolutionKey(settings.evolutionApiKey ?? '')
      setEvolutionInstance(settings.evolutionInstance ?? '')
      setAsaasSandbox(settings.asaasSandbox ?? true)
      // mpToken nunca é inicializado com o valor mascarado '••••••••' — começa vazio
      setMpKey(settings.mpPublicKey ?? '')
      setMpSandbox(settings.mpSandbox ?? true)
      setPrimaryColor(settings.primaryColor ?? '#f97316')
      setLayoutStyle(settings.layoutStyle ?? 'grid')
      setBannerUrl(settings.bannerUrl ?? '')
    }
  }, [settings])

  useEffect(() => {
    if (storeInfo) {
      setStoreName(storeInfo.name ?? '')
      setStorePhone(storeInfo.phone ?? '')
      setStoreWhatsapp(storeInfo.whatsapp ?? '')
      setStoreAddress(storeInfo.address ?? '')
      setStoreNumber(storeInfo.number ?? '')
      setStoreDistrict(storeInfo.district ?? '')
      setStoreCity(storeInfo.city ?? '')
      setStoreState(storeInfo.state ?? '')
      setStoreZipCode(storeInfo.zipCode ?? '')
      setStoreDescription(storeInfo.description ?? '')
      setStoreInstagram(storeInfo.instagram ?? '')
      setStoreFacebook(storeInfo.facebook ?? '')
    }
  }, [storeInfo])

  // Formulário nova forma de pagamento
  const [showAddPm, setShowAddPm] = useState(false)
  const [newPmType, setNewPmType] = useState('')
  const [newPmLabel, setNewPmLabel] = useState('')

  if (isLoading || !settings) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  async function handleSaveMp(e: React.FormEvent) {
    e.preventDefault()
    setMpError('')
    try {
      await updateSettings.mutateAsync({
        mpAccessToken: mpToken.trim() || undefined,
        mpPublicKey: mpKey.trim() || undefined,
        mpSandbox,
      })
      setMpSuccess(true)
      setTimeout(() => setMpSuccess(false), 3000)
    } catch (err: any) {
      setMpError(err?.response?.data?.message ?? 'Erro ao salvar Mercado Pago.')
    }
  }

  async function handleSaveAsaas(e: React.FormEvent) {
    e.preventDefault()
    setAsaasError('')
    try {
      await updateSettings.mutateAsync({
        asaasApiKey: asaasKey.trim() || null,
        asaasSandbox,
      })
      setAsaasKey('')
      setAsaasSuccess(true)
      setTimeout(() => setAsaasSuccess(false), 3000)
    } catch (err: any) {
      setAsaasError(err?.response?.data?.message ?? 'Erro ao salvar configuração Asaas.')
    }
  }

  async function handleSaveEvolution(e: React.FormEvent) {
    e.preventDefault()
    setEvolutionError('')
    try {
      await updateSettings.mutateAsync({
        evolutionApiUrl: evolutionUrl.trim() || undefined,
        evolutionApiKey: evolutionKey.trim() || undefined,
        evolutionInstance: evolutionInstance.trim() || undefined,
      })
      setEvolutionSuccess(true)
      setTimeout(() => setEvolutionSuccess(false), 3000)
    } catch (err: any) {
      setEvolutionError(err?.response?.data?.message ?? 'Erro ao salvar WhatsApp.')
    }
  }

  async function handleAddPm(e: React.FormEvent) {
    e.preventDefault()
    if (!newPmType || !newPmLabel) return
    try {
      await createPm.mutateAsync({ type: newPmType, label: newPmLabel })
      setNewPmType('')
      setNewPmLabel('')
      setShowAddPm(false)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Erro ao adicionar forma de pagamento.')
    }
  }

  function handleSelectPmType(type: string) {
    setNewPmType(type)
    const found = PAYMENT_TYPE_OPTIONS.find((o) => o.type === type)
    if (found) setNewPmLabel(found.label)
  }

  async function handleSaveStoreInfo(e: React.FormEvent) {
    e.preventDefault()
    setStoreInfoError('')
    try {
      await updateStoreInfo.mutateAsync({
        name: storeName || undefined,
        phone: storePhone || undefined,
        whatsapp: storeWhatsapp || undefined,
        address: storeAddress || undefined,
        number: storeNumber || undefined,
        district: storeDistrict || undefined,
        city: storeCity || undefined,
        state: storeState || undefined,
        zipCode: storeZipCode || undefined,
        description: storeDescription || undefined,
        instagram: storeInstagram || undefined,
        facebook: storeFacebook || undefined,
      })
      setStoreInfoSaved(true)
      setTimeout(() => setStoreInfoSaved(false), 3000)
    } catch (err: any) {
      setStoreInfoError(err?.response?.data?.message ?? 'Erro ao salvar dados da loja.')
    }
  }

  async function handleSaveAppearance(e: React.FormEvent) {
    e.preventDefault()
    setAppearanceError('')
    try {
      await updateSettings.mutateAsync({
        primaryColor,
        layoutStyle,
        bannerUrl: bannerUrl.trim() || undefined,
      })
      setAppearanceSuccess(true)
      setTimeout(() => setAppearanceSuccess(false), 3000)
    } catch (err: any) {
      setAppearanceError(err?.response?.data?.message ?? 'Erro ao salvar aparência.')
    }
  }

  const existingTypes = new Set(settings.paymentMethods.map((pm) => pm.type))

  const storeUrl = `${process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3001'}/${store?.slug ?? ''}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
    <div className="flex-1 overflow-y-auto">
      {/* Cabeçalho + abas (sticky no topo) */}
      <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-6 pt-6 pb-3 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure pagamentos, integrações e aparência da sua loja</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'border text-muted-foreground hover:bg-muted'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="mx-auto w-full max-w-3xl px-6 py-6 space-y-6">

      {/* ── Dados da Loja ── */}
      {activeTab === 'loja' && (
      <section className="rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-foreground">Dados da Loja</h2>
            <p className="text-xs text-muted-foreground">Informações exibidas na vitrine e usadas para entrega</p>
          </div>
        </div>
        <form onSubmit={handleSaveStoreInfo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Nome da Loja</label>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefone</label>
              <input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="(11) 9999-9999"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">WhatsApp</label>
              <input value={storeWhatsapp} onChange={(e) => setStoreWhatsapp(e.target.value)} placeholder="(11) 99999-9999"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={2}
                placeholder="Ex: Pizzaria artesanal com ingredientes selecionados..."
                className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CEP</label>
              <input value={storeZipCode} onChange={(e) => setStoreZipCode(e.target.value)} placeholder="00000-000"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Número</label>
              <input value={storeNumber} onChange={(e) => setStoreNumber(e.target.value)} placeholder="123"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Endereço (Rua/Av)</label>
              <input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Rua das Flores"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bairro</label>
              <input value={storeDistrict} onChange={(e) => setStoreDistrict(e.target.value)}
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cidade</label>
              <input value={storeCity} onChange={(e) => setStoreCity(e.target.value)}
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instagram</label>
              <input value={storeInstagram} onChange={(e) => setStoreInstagram(e.target.value)} placeholder="@minhaloja"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Facebook</label>
              <input value={storeFacebook} onChange={(e) => setStoreFacebook(e.target.value)} placeholder="minhaloja"
                className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {storeInfoError && <p className="text-sm text-destructive">{storeInfoError}</p>}
          <button type="submit" disabled={updateStoreInfo.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
            {storeInfoSaved ? <><Check className="h-4 w-4" />Salvo!</> : updateStoreInfo.isPending ? 'Salvando...' : 'Salvar Dados da Loja'}
          </button>
        </form>
      </section>

      )}

      {/* ── Formas de Pagamento ─────────────────────────────────────── */}
      {activeTab === 'pagamentos' && (
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Formas de Pagamento</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Ative ou desative as formas de pagamento que sua loja aceita.
        </p>

        <div className="space-y-2">
          {settings.paymentMethods.map((pm) => (
            <div key={pm.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {PAYMENT_TYPE_OPTIONS.find((o) => o.type === pm.type)?.emoji ?? '💰'}
                </span>
                <div>
                  <p className="text-sm font-medium">{pm.label}</p>
                  <p className="text-xs text-muted-foreground">{pm.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle */}
                <button
                  onClick={() => togglePm.mutate({ id: pm.id, isActive: !pm.isActive })}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                    ${pm.isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                    ${pm.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                {/* Delete */}
                <button
                  onClick={() => {
                    if (confirm(`Remover "${pm.label}" como forma de pagamento?`))
                      deletePm.mutate(pm.id)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar nova forma */}
        {showAddPm ? (
          <form onSubmit={handleAddPm} className="rounded-xl border border-dashed p-4 space-y-3">
            <p className="text-sm font-medium">Adicionar forma de pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPE_OPTIONS.filter((o) => !existingTypes.has(o.type)).map((o) => (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => handleSelectPmType(o.type)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors
                    ${newPmType === o.type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
            {newPmType && (
              <input
                className="h-9 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Rótulo (ex: Cartão de Crédito)"
                value={newPmLabel}
                onChange={(e) => setNewPmLabel(e.target.value)}
                required
              />
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={!newPmType || createPm.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                <Check className="h-3.5 w-3.5" />
                {createPm.isPending ? 'Salvando...' : 'Adicionar'}
              </button>
              <button type="button" onClick={() => setShowAddPm(false)}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddPm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition">
            <Plus className="h-4 w-4" />
            Adicionar forma de pagamento
          </button>
        )}
      </section>

      )}

      {/* ── WhatsApp — Evolution API ───────────────────────────────── */}
      {activeTab === 'notificacoes' && (
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold text-base">WhatsApp — Evolution API</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure a Evolution API para enviar notificações automáticas ao cliente
          (pedido recebido, saiu para entrega, entregue, cancelado).
        </p>

        {/* Status atual */}
        <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2
          ${settings.evolutionApiUrl && settings.evolutionInstance
            ? 'bg-green-50 text-green-700'
            : 'bg-muted text-muted-foreground'}`}>
          <span className="text-base">{settings.evolutionApiUrl ? '✅' : '⚙️'}</span>
          {settings.evolutionApiUrl
            ? `Instância: ${settings.evolutionInstance ?? '—'}`
            : 'Não configurado — notificações WhatsApp desativadas'}
        </div>

        <form onSubmit={handleSaveEvolution} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">URL da Evolution API</label>
            <input
              className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://sua-evolution.com"
              value={evolutionUrl}
              onChange={(e) => setEvolutionUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">API Key global</label>
            <input
              type="password"
              className="h-10 w-full rounded-xl border px-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={settings.evolutionApiKey ? '••••••••••••••••' : 'sua-api-key'}
              value={evolutionKey}
              onChange={(e) => setEvolutionKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Nome da instância</label>
            <input
              className="h-10 w-full rounded-xl border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="minha-loja"
              value={evolutionInstance}
              onChange={(e) => setEvolutionInstance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Nome da instância criada no painel da Evolution API.</p>
          </div>

          {evolutionError && <p className="text-sm text-destructive">{evolutionError}</p>}
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-green-700 transition"
          >
            {evolutionSuccess ? <><Check className="h-4 w-4" /> Salvo!</> : updateSettings.isPending ? 'Salvando...' : 'Salvar WhatsApp'}
          </button>
        </form>
      </section>

      )}

      {/* ── Mercado Pago ──────────────────────────────────────────────── */}
      {activeTab === 'pagamentos' && (
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💳</span>
          <h2 className="font-semibold text-base">Mercado Pago (PIX + Cartão)</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Aceite PIX e cartões via Mercado Pago. Crie sua conta e obtenha as credenciais em{' '}
          <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mercadopago.com.br/developers</a>.
        </p>
        <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 ${settings?.mpAccessToken ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
          <span>{settings?.mpAccessToken ? '✅ Mercado Pago configurado' : '⚠️ Não configurado — PIX MP desativado'}</span>
        </div>
        <form onSubmit={handleSaveMp} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Access Token (Server)</label>
            <input type="password" placeholder={settings?.mpAccessToken ? '••••••••' : 'APP_USR-...'} value={mpToken} onChange={e => setMpToken(e.target.value)}
              className="h-10 w-full rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Public Key (Frontend)</label>
            <input placeholder="APP_USR-..." value={mpKey} onChange={e => setMpKey(e.target.value)}
              className="h-10 w-full rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mpSandbox} onChange={e => setMpSandbox(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-sm">Modo sandbox (testes)</span>
          </label>
          {mpError && <p className="text-sm text-destructive">{mpError}</p>}
          <button type="submit" disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
            {mpSuccess ? <><Check className="h-4 w-4" /> Salvo!</> : updateSettings.isPending ? 'Salvando...' : 'Salvar Mercado Pago'}
          </button>
        </form>
      </section>

      )}

      {/* ── Gateway Asaas (Pix Online) ──────────────────────────────── */}
      {activeTab === 'pagamentos' && (
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Gateway Pix — Asaas</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure sua conta Asaas para aceitar pagamentos Pix online com QR Code automático.
          Crie sua conta em{' '}
          <span className="font-medium text-foreground">asaas.com</span>.
        </p>

        {/* Status atual */}
        <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center gap-2
          ${settings.asaasApiKey ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          <span className="text-base">{settings.asaasApiKey ? '✅' : '⚠️'}</span>
          {settings.asaasApiKey
            ? `Configurado${settings.asaasSandbox ? ' (modo sandbox)' : ' (produção)'}`
            : 'Não configurado — Pix funcionará como manual'}
        </div>

        <form onSubmit={handleSaveAsaas} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Chave de API Asaas</label>
            <input
              className="h-10 w-full rounded-xl border px-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={settings.asaasApiKey ? '••••••••••••••••' : 'aact_...'}
              value={asaasKey}
              onChange={(e) => setAsaasKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Deixe em branco para manter a chave atual, ou insira uma nova.</p>
          </div>

          {/* Sandbox toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setAsaasSandbox((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none
                ${asaasSandbox ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
                ${asaasSandbox ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <div>
              <p className="text-sm font-medium">Modo Sandbox (testes)</p>
              <p className="text-xs text-muted-foreground">Desative apenas quando estiver pronto para produção</p>
            </div>
          </label>

          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition"
          >
            {asaasSuccess ? <><Check className="h-4 w-4" /> Salvo!</> : updateSettings.isPending ? 'Salvando...' : 'Salvar configuração'}
          </button>
          {asaasError && <p className="text-sm text-destructive">{asaasError}</p>}
        </form>
      </section>

      )}

      {/* ── Aparência da Vitrine ── */}
      {activeTab === 'aparencia' && (
      <section className="rounded-2xl border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-foreground">Aparência da Vitrine</h2>
              <p className="text-xs text-muted-foreground">Personalize a cor, layout e banner da sua loja</p>
            </div>
          </div>
          {store?.slug && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <ExternalLink className="h-3.5 w-3.5" /> Ver vitrine
            </a>
          )}
        </div>

        <form onSubmit={handleSaveAppearance} className="space-y-5">
          {/* Cor primária */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cor principal da vitrine</label>
            <p className="text-xs text-muted-foreground">Usada nos botões, preços e destaques da loja</p>
            <div className="flex items-center gap-3 flex-wrap">
              {['#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#000000'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: color, borderColor: primaryColor === color ? '#000' : 'transparent', outline: primaryColor === color ? `3px solid ${color}` : 'none', outlineOffset: '2px' }}
                />
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border border-input overflow-hidden p-0.5 bg-transparent"
                />
                <span className="text-xs font-mono text-muted-foreground uppercase">{primaryColor}</span>
              </div>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 mt-3">
              <div className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition" style={{ backgroundColor: primaryColor }}>
                Adicionar ao carrinho
              </div>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>R$ 29,90</span>
              <span className="text-xs text-muted-foreground ml-1">← preview</span>
            </div>
          </div>

          {/* Layout dos produtos */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Layout dos produtos</label>
            <p className="text-xs text-muted-foreground">Como os produtos são exibidos na vitrine</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLayoutStyle('grid')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${layoutStyle === 'grid' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <LayoutGrid className={`h-6 w-6 ${layoutStyle === 'grid' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className={`text-sm font-semibold ${layoutStyle === 'grid' ? 'text-primary' : 'text-foreground'}`}>Grade</p>
                  <p className="text-xs text-muted-foreground">2 colunas com imagens em destaque</p>
                </div>
                {/* Mini preview */}
                <div className="grid grid-cols-2 gap-1 w-full mt-1">
                  {[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-muted" />)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayoutStyle('list')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${layoutStyle === 'list' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <AlignJustify className={`h-6 w-6 ${layoutStyle === 'list' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <p className={`text-sm font-semibold ${layoutStyle === 'list' ? 'text-primary' : 'text-foreground'}`}>Lista</p>
                  <p className="text-xs text-muted-foreground">Uma coluna com foto à direita</p>
                </div>
                {/* Mini preview */}
                <div className="flex flex-col gap-1 w-full mt-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-1 h-7 rounded bg-muted px-2">
                      <div className="flex-1 h-2 rounded bg-muted-foreground/20" />
                      <div className="h-5 w-5 rounded bg-muted-foreground/20 shrink-0" />
                    </div>
                  ))}
                </div>
              </button>
            </div>
          </div>

          {/* Banner */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">URL do Banner <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <p className="text-xs text-muted-foreground">Imagem exibida no topo da vitrine, abaixo do cabeçalho</p>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://exemplo.com/banner.jpg"
              className="w-full h-10 rounded-xl border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
            {bannerUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border aspect-[3/1] bg-muted">
                <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition"
          >
            {appearanceSuccess ? <><Check className="h-4 w-4" /> Salvo!</> : updateSettings.isPending ? 'Salvando...' : 'Salvar aparência'}
          </button>
          {appearanceError && <p className="text-sm text-destructive">{appearanceError}</p>}
        </form>
      </section>

      )}

      {/* ── Marketing & Rastreamento ── */}
      {activeTab === 'marketing' && <MarketingSection settings={settings} />}

      {/* ── Avisos no Cardápio ── */}
      {activeTab === 'aparencia' && <NoticeSection settings={settings} />}

      {/* ── Som de Pedidos ── */}
      {activeTab === 'notificacoes' && <SoundSection settings={settings} />}

      {/* ── Domínio Próprio ── */}
      {activeTab === 'loja' && <DomainSection settings={settings} />}
      </div>
    </div>
    </div>
  )
}

function MarketingSection({ settings }: { settings: any }) {
  const updateSettings = useUpdateSettings()
  const [pixelId, setPixelId] = useState(settings?.facebookPixelId ?? '')
  const [gtmId, setGtmId] = useState(settings?.googleTagManagerId ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setPixelId(settings?.facebookPixelId ?? ''); setGtmId(settings?.googleTagManagerId ?? '') }, [settings])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateSettings.mutateAsync({ facebookPixelId: pixelId || null, googleTagManagerId: gtmId || null })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Erro ao salvar.') }
  }
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50"><span className="text-lg">📊</span></div>
        <div><h2 className="font-semibold text-base">Marketing & Rastreamento</h2><p className="text-xs text-muted-foreground">Pixel do Facebook e Google Tag Manager</p></div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Facebook Pixel ID</label>
          <input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="123456789012345"
            className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <p className="text-xs text-muted-foreground">Encontre em Gerenciador de Eventos do Facebook Ads</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Google Tag Manager ID</label>
          <input value={gtmId} onChange={e => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX"
            className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={updateSettings.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
          {saved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar'}
        </button>
      </form>
    </section>
  )
}

function NoticeSection({ settings }: { settings: any }) {
  const updateSettings = useUpdateSettings()
  const [notice, setNotice] = useState(settings?.storeNotice ?? '')
  const [type, setType] = useState(settings?.storeNoticeType ?? 'info')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setNotice(settings?.storeNotice ?? ''); setType(settings?.storeNoticeType ?? 'info') }, [settings])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateSettings.mutateAsync({ storeNotice: notice || null, storeNoticeType: type })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Erro ao salvar.') }
  }
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50"><span className="text-lg">📢</span></div>
        <div><h2 className="font-semibold text-base">Aviso no Cardápio</h2><p className="text-xs text-muted-foreground">Exibe um banner de aviso para os clientes na vitrine</p></div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[['info','ℹ️ Informação'],['warning','⚠️ Alerta'],['success','✅ Sucesso']].map(([v,l]) => (
            <button key={v} type="button" onClick={() => setType(v)}
              className={`h-9 rounded-xl border text-xs font-medium transition ${type === v ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}>{l}</button>
          ))}
        </div>
        <textarea value={notice} onChange={e => setNotice(e.target.value)} rows={2}
          placeholder="Ex: Estamos com alta demanda. O tempo de entrega pode ser maior hoje."
          className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
            {saved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar Aviso'}
          </button>
          {notice && <button type="button" onClick={() => updateSettings.mutate({ storeNotice: null })}
            className="rounded-xl border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition">Remover aviso</button>}
        </div>
      </form>
    </section>
  )
}

function SoundSection({ settings }: { settings: any }) {
  const updateSettings = useUpdateSettings()
  const SOUNDS = [
    { label: 'Padrão (sino)', value: '' },
    { label: 'Campainha', value: '/sounds/bell.mp3' },
    { label: 'Notificação suave', value: '/sounds/soft.mp3' },
    { label: 'Alerta', value: '/sounds/alert.mp3' },
    { label: 'Jingle', value: '/sounds/jingle.mp3' },
  ]
  const [sound, setSound] = useState(settings?.orderSoundUrl ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setSound(settings?.orderSoundUrl ?? '') }, [settings])
  async function save() {
    setError('')
    try {
      await updateSettings.mutateAsync({ orderSoundUrl: sound || null })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
      if (sound) { const a = new Audio(sound); a.play().catch(() => {}) }
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Erro ao salvar.') }
  }
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50"><span className="text-lg">🔔</span></div>
        <div><h2 className="font-semibold text-base">Som de Novos Pedidos</h2><p className="text-xs text-muted-foreground">Escolha o som tocado quando chegar um pedido</p></div>
      </div>
      <div className="space-y-2">
        {SOUNDS.map(s => (
          <button key={s.value} type="button" onClick={() => setSound(s.value)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition ${sound === s.value ? 'border-primary bg-primary/5 text-primary font-medium' : 'hover:bg-muted'}`}>
            {s.label}
            {sound === s.value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={save} disabled={updateSettings.isPending}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
        {saved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar Som'}
      </button>
    </section>
  )
}

function DomainSection({ settings }: { settings: any }) {
  const updateSettings = useUpdateSettings()
  const [domain, setDomain] = useState(settings?.customDomain ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setDomain(settings?.customDomain ?? '') }, [settings])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateSettings.mutateAsync({ customDomain: domain || null })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Erro ao salvar.') }
  }
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50"><span className="text-lg">🌐</span></div>
        <div><h2 className="font-semibold text-base">Domínio Próprio</h2><p className="text-xs text-muted-foreground">Aponte seu domínio para a vitrine da loja</p></div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="pedidos.minhapizzaria.com.br"
          className="w-full h-10 rounded-xl border border-input px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Como configurar:</p>
          <p>1. No painel do seu domínio, adicione um registro CNAME apontando para: <code className="bg-muted px-1 rounded">delivery.seuservidor.com</code></p>
          <p>2. Aguarde até 24h para propagação do DNS</p>
          <p>3. Salve o domínio abaixo para ativá-lo no sistema</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={updateSettings.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition">
          {saved ? <><Check className="h-4 w-4" />Salvo!</> : 'Salvar Domínio'}
        </button>
      </form>
    </section>
  )
}
