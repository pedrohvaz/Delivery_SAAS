import { z } from 'zod'

export const customerRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone: z.string().min(8, 'Telefone inválido'),
  email: z.string().email('E-mail inválido').optional(),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  cpf: z.string().optional(),
})

export const customerLoginSchema = z.object({
  identifier: z.string().min(3, 'Informe telefone ou e-mail'), // telefone (dígitos) OU e-mail
  password: z.string().min(1, 'Informe a senha'),
})

export const customerRefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const accountAddressSchema = z.object({
  label: z.string().optional(),
  street: z.string().min(1, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(1, 'Bairro obrigatório'),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().min(1, 'Estado obrigatório'),
  zipCode: z.string().min(1, 'CEP obrigatório'),
  reference: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
})

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>
export type AccountAddressInput = z.infer<typeof accountAddressSchema>
