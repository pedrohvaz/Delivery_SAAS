export function currency(value: number | string | null | undefined) {
  // Coage para número: a API serializa Decimal (Prisma) como string ("16.5"),
  // e String.toLocaleString ignora as opções de moeda, devolvendo o texto cru.
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
