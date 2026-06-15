import { z } from 'zod'

export const produtoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().default(''),
  preco: z.number().nonnegative(),
  categoria: z.string().optional().default('Outros'),
  desconto: z.number().int().min(1).max(99).optional(),
  imagem_url: z.string().url().nullable().optional(),
})

export const infoExtraSchema = z.object({
  texto: z.string().min(1),
  icone: z.string().optional().default(''),
  posicao: z.enum(['topo', 'rodape']).default('topo'),
  destaque: z.boolean().optional().default(false),
})

export const configIaSchema = z
  .object({
    tipo_estabelecimento: z.string().optional().default(''),
    estilo: z.string().optional().default(''),
    paleta_cores: z.string().optional().default(''),
    descricao_visual: z.string().optional().default(''),
    qualidade: z.enum(['standard', 'hd']).optional().default('standard'),
    blur_fundo: z.number().int().min(0).max(20).optional().default(0),
    overlay_opacidade: z.number().min(0).max(1).optional().default(0),
  })
  .passthrough()

export const gerarCardapioSchema = z
  .object({
    modo: z.enum(['manual', 'ia_fundo', 'ia_completo']).default('manual'),
    titulo: z.string().min(1, 'Informe um título para o cardápio'),
    subtitulo: z.string().optional().default(''),
    rodape_texto: z.string().optional().default(''),
    template_key: z.string().optional(),
    template_customizado: z.record(z.string(), z.unknown()).optional(),
    incluir_logo: z.boolean().optional().default(false),
    logo_url: z.string().url().nullable().optional(),
    logo_tamanho: z.number().int().positive().max(300).optional().default(80),
    incluir_qr: z.boolean().optional().default(false),
    qr_url: z.string().optional(),
    qr_legenda: z.string().optional().default(''),
    infos_extras: z.array(infoExtraSchema).optional().default([]),
    produtos: z.array(produtoSchema).min(1, 'Selecione ao menos um produto'),
    config_ia: configIaSchema.optional(),
    largura: z.number().int().min(480).max(2160).optional().default(1080),
    num_colunas: z.number().int().min(1).max(4).optional().default(2),
    nome_arquivo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.template_key && !data.template_customizado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe 'template_key' ou 'template_customizado'.",
        path: ['template_key'],
      })
    }
    if (data.modo !== 'manual' && !data.config_ia) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "'config_ia' é obrigatório para os modos 'ia_fundo' e 'ia_completo'.",
        path: ['config_ia'],
      })
    }
  })

export const validarTemplateSchema = z.object({
  template: z.record(z.string(), z.unknown()),
})
