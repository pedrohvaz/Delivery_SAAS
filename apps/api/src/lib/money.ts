/** Valor em reais no formato brasileiro: 1234.5 → "R$ 1.234,50" (espaço comum, para mensagens de texto). */
export function brl(value: number | string | null | undefined): string {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ')
}
