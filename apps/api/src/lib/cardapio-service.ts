export async function gerarCardapio(payload: unknown): Promise<Buffer> {
  const url = `${process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8001'}/gerar-cardapio`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Serviço de cardápio retornou ${res.status}${detail ? `: ${detail}` : ''}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
