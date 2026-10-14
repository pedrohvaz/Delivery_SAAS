import { StoreBottomNav } from '@/components/store/bottom-nav'
import { StoreTheme } from '@/components/store/store-theme'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreTheme />
      {children}
      <StoreBottomNav />
    </>
  )
}
