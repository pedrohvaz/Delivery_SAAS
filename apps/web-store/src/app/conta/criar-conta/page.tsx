'use client'

import { RegisterForm } from '@/components/account/RegisterForm'

export default function ContaCriarContaPage() {
  return <RegisterForm defaultRedirect="/conta" loginHref="/conta/entrar" />
}
