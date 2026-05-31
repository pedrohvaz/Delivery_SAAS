export function currency(value: number | string | null | undefined): string {
  // Coage para número: a API serializa Decimal (Prisma) como string ("16.5"),
  // e String.toLocaleString ignora as opções de moeda, devolvendo o texto cru.
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
