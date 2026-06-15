/**
 * Provisionamento de instâncias da Evolution API (uma por loja).
 * Usa a chave GLOBAL da plataforma (EVOLUTION_API_URL / EVOLUTION_API_KEY).
 * Cada loja recebe uma instância nomeada pelo seu slug, com webhook apontando
 * para a API do delivery (/automation/webhook/{slug}).
 *
 * Os endpoints/payloads seguem a Evolution API v2. Como pequenas variações
 * existem entre versões, as chamadas são tolerantes (não quebram o fluxo).
 */

export interface EvoConfig {
  url: string
  key: string
}

/** Lê a config da plataforma do ambiente. Retorna null se não configurada. */
export function platformEvolution(): EvoConfig | null {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

async function evoFetch(cfg: EvoConfig, method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${cfg.url}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', apikey: cfg.key },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  })
  const text = await res.text().catch(() => '')
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* resposta não-JSON */
  }
  if (!res.ok) throw new Error(`Evolution ${res.status}: ${text || res.statusText}`)
  return json
}

const WEBHOOK_EVENTS = ['MESSAGES_UPSERT']

/** Garante que a instância existe; cria com webhook se necessário. */
export async function ensureInstance(cfg: EvoConfig, instance: string, webhookUrl: string): Promise<void> {
  let exists = false
  try {
    const list = await evoFetch(cfg, 'GET', '/instance/fetchInstances')
    if (Array.isArray(list)) {
      exists = list.some((i: any) => (i?.instance?.instanceName ?? i?.name ?? i?.instanceName) === instance)
    }
  } catch {
    /* fetch pode falhar em algumas versões; segue para tentar criar */
  }

  if (!exists) {
    await evoFetch(cfg, 'POST', '/instance/create', {
      instanceName: instance,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: { url: webhookUrl, enabled: true, events: WEBHOOK_EVENTS },
    })
  }
  // Garante o webhook correto mesmo se a instância já existia
  await setWebhook(cfg, instance, webhookUrl).catch(() => {})
}

export async function setWebhook(cfg: EvoConfig, instance: string, url: string): Promise<void> {
  await evoFetch(cfg, 'POST', `/webhook/set/${instance}`, {
    webhook: { enabled: true, url, webhookByEvents: false, events: WEBHOOK_EVENTS },
  })
}

export interface QrResult {
  base64?: string | null
  code?: string | null
  state?: string | null
}

/** Conecta a instância e retorna o QRCode (base64) / pairing code. */
export async function getQrCode(cfg: EvoConfig, instance: string): Promise<QrResult> {
  const r = await evoFetch(cfg, 'GET', `/instance/connect/${instance}`)
  return {
    base64: r?.base64 ?? r?.qrcode?.base64 ?? null,
    code: r?.code ?? r?.pairingCode ?? r?.qrcode?.code ?? null,
    state: r?.instance?.state ?? null,
  }
}

/** Estado da conexão: 'open' (conectado) | 'connecting' | 'close' | 'unknown'. */
export async function getState(cfg: EvoConfig, instance: string): Promise<string> {
  try {
    const r = await evoFetch(cfg, 'GET', `/instance/connectionState/${instance}`)
    return r?.instance?.state ?? r?.state ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function logoutInstance(cfg: EvoConfig, instance: string): Promise<void> {
  await evoFetch(cfg, 'DELETE', `/instance/logout/${instance}`).catch(() => {})
}

export async function deleteInstance(cfg: EvoConfig, instance: string): Promise<void> {
  await evoFetch(cfg, 'DELETE', `/instance/delete/${instance}`).catch(() => {})
}
