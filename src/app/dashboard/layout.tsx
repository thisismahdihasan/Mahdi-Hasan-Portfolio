import type { ReactNode } from 'react'
import DashboardQueryProvider from './components/DashboardQueryProvider'

export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardQueryProvider>
      {/* Material Symbols — dashboard only, doesn't affect public portfolio */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      {children}
    </DashboardQueryProvider>
  )
}
