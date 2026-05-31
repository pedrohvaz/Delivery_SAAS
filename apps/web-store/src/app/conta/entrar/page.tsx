'use client'

import { LoginForm } from '@/components/account/LoginForm'

export default function ContaEntrarPage() {
  return <LoginForm defaultRedirect="/conta" registerHref="/conta/criar-conta" guestHref="/" />
}
