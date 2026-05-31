import { StoreBottomNav } from '@/components/store/bottom-nav'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StoreBottomNav />
    </>
  )
}
