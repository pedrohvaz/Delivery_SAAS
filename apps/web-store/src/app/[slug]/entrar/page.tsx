'use client'

import { useParams } from 'next/navigation'
import { LoginForm } from '@/components/account/LoginForm'

export default function EntrarPage() {
  const { slug } = useParams<{ slug: string }>()
  return <LoginForm defaultRedirect={`/${slug}/minha-conta`} registerHref={`/${slug}/criar-conta`} guestHref={`/${slug}`} />
}
