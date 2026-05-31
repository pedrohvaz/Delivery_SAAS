'use client'

import { useParams } from 'next/navigation'
import { RegisterForm } from '@/components/account/RegisterForm'

export default function CriarContaPage() {
  const { slug } = useParams<{ slug: string }>()
  return <RegisterForm defaultRedirect={`/${slug}/minha-conta`} loginHref={`/${slug}/entrar`} />
}
