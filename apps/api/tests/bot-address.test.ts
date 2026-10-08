import { describe, expect, it } from 'vitest'
import { parseAddressText } from '../src/lib/bot/fixed-flow/address'
import { cleanWhatsAppName } from '../src/lib/bot/crm'

// Endereços reais que o bot recusou na conversa do Bar Lisboa (08/10/2026)
const BAIRROS = ['Centro', 'Dom Oscar']

describe('endereço em texto livre', () => {
  it('"avenida são joao del rei 143 dom oscar" (sem vírgulas)', () => {
    expect(parseAddressText('avenida são joao del rei 143 dom oscar', BAIRROS)).toMatchObject({
      street: 'avenida são joao del rei', number: '143', district: 'Dom Oscar',
    })
  })

  it('"avenida doutor jose gonçalves da cunha centro 167" (bairro antes do número)', () => {
    expect(parseAddressText('avenida doutor jose gonçalves da cunha centro 167', BAIRROS)).toMatchObject({
      street: 'avenida doutor jose gonçalves da cunha', number: '167', district: 'Centro',
    })
  })

  it('formato com vírgulas continua funcionando', () => {
    expect(parseAddressText('Av Doutor Jose Gonçalves da cunha , 187, centro', BAIRROS)).toMatchObject({
      street: 'Av Doutor Jose Gonçalves da cunha', number: '187', district: 'Centro',
    })
  })

  it('só o bairro: não inventa rua nem número (o bot pergunta o que falta)', () => {
    const r = parseAddressText('centro', BAIRROS)
    expect(r.district).toBe('Centro')
    expect(r.street).toBeUndefined()
    expect(r.number).toBeUndefined()
  })

  it('rua com número no nome + complemento', () => {
    expect(parseAddressText('Rua 7 de Setembro 100 apto 12 centro', BAIRROS)).toMatchObject({
      street: 'Rua 7 de Setembro', number: '100', district: 'Centro', complement: 'apto 12',
    })
  })

  it('"nº" antes do número e cidade/UF no fim', () => {
    expect(parseAddressText('Rua das Flores nº 55, Centro, Belo Horizonte/MG', BAIRROS)).toMatchObject({
      street: 'Rua das Flores', number: '55', district: 'Centro', city: 'Belo Horizonte', state: 'MG',
    })
  })

  it('bairro fora da lista da loja fica como digitado (a taxa decide se atende)', () => {
    expect(parseAddressText('Rua A 10 Jardim Europa', BAIRROS)).toMatchObject({ street: 'Rua A', number: '10', district: 'Jardim Europa' })
  })

  it('sem número: pega a rua e deixa o número em aberto', () => {
    const r = parseAddressText('Rua das Acácias', BAIRROS)
    expect(r.street).toBe('Rua das Acácias')
    expect(r.number).toBeUndefined()
  })
})

describe('nome do perfil do WhatsApp', () => {
  it.each([
    ['Rafael Lisboa', 'Rafael Lisboa'],
    ['  João   Silva 🍔 ', 'João Silva 🍔'],
    ['.', null],
    ['🙂', null],
    ['', null],
  ])('%j → %j', (input, expected) => {
    expect(cleanWhatsAppName(input)).toBe(expected)
  })
})
