import { describe, expect, it } from 'vitest'
import { parseControl } from '../src/lib/bot/llm-flow'

// Resposta real do gpt-4o-mini (Bar Lisboa, 08/10/2026): o modelo entrou em loop,
// o JSON foi cortado no limite de tokens e o texto cru chegou ao cliente.
const garbage = Array(60).fill('PMPL이 확인할 수 없습니다.').join('  ')
const BROKEN = `{"reply":"Bom dia! 😊 Tudo bem, e você? Aqui estão os nossos Hambúrgueres Artesanais: \\n\\n• *Beef 1* — R$ 30,00 (Pão, molho, queijo, bacon, hambúrguer de pura carne bovina 150g e salada)  \\n• *Beef 2* — R$ 40,00 (Pão, molho, 2 vezes queijo, bacon, 2 hambúrgueres de pura carne bovina 150g e salada) \\n• *Beef 3* — R$ 50,00 (Pão, molho, 3 vezes queijo, bacon, 3 hambúrgueres de pura carne bovina 150g e salada) \\n\\nSe precisar de mais informações ou quiser adicionar algum item ao seu pedido, é só me avisar! 🍔","cart":[],"intent":"browsing","orderType":"DELIVERY","customerName":"","}   이 메세지를 다른 방법으로 답변하세요.  H1-2279-1202-1560-73368   TTY-본 메세지를 담을 수 없습니다.  ${garbage}  PMPL`

describe('parseControl — o cliente nunca recebe JSON cru nem lixo', () => {
  it('recupera só o texto do "reply" de um JSON cortado/corrompido', () => {
    const { reply, ok } = parseControl(BROKEN)
    expect(ok).toBe(true)
    expect(reply).toContain('Beef 1')
    expect(reply).toContain('Beef 3')
    expect(reply).not.toContain('{"reply"')
    expect(reply).not.toContain('"cart"')
    expect(reply).not.toMatch(/[\uac00-\ud7af]/) // nada de coreano
    expect(reply).toContain('\n') // \n do JSON vira quebra de linha real
  })

  it('converte negrito do Markdown (**x**) para o do WhatsApp (*x*)', () => {
    const { reply } = parseControl('{"reply":"Temos **Beef 1** e **Beef 2**!\\n## Bebidas","cart":[],"intent":"browsing","orderType":"DELIVERY","customerName":""}')
    expect(reply).toBe('Temos *Beef 1* e *Beef 2*!\nBebidas')
  })

  it('JSON válido continua funcionando (reply + bloco de controle)', () => {
    const { reply, control, ok } = parseControl('{"reply":"Oi! 😊","cart":[],"intent":"browsing","orderType":"PICKUP","customerName":"Ana"}')
    expect(ok).toBe(true)
    expect(reply).toBe('Oi! 😊')
    expect(control?.orderType).toBe('PICKUP')
  })

  it('texto livre normal (sem JSON) é aceito', () => {
    const { reply, ok } = parseControl('Temos Beef 1, Beef 2 e Beef 3! 🍔')
    expect(ok).toBe(true)
    expect(reply).toBe('Temos Beef 1, Beef 2 e Beef 3! 🍔')
  })

  it('lixo sem "reply" aproveitável é marcado como falha (vira mensagem padrão)', () => {
    const { ok, reply } = parseControl(`{"cart":[],"intent":"browsing" ${garbage}`)
    expect(ok).toBe(false)
    expect(reply).toBe('')
  })

  it('reply válido mas degenerado (repetição/outro alfabeto) também é falha', () => {
    const { ok } = parseControl(JSON.stringify({ reply: `Olá! ${garbage}`, cart: [], intent: 'browsing', orderType: 'DELIVERY', customerName: '' }))
    expect(ok).toBe(false)
  })
})
