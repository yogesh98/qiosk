import { Outlet } from '@tanstack/react-router'
import { Navbar } from '@/components/features/navbar/navbar'

export function CmsPage() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
