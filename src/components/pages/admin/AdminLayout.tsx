import { Outlet } from '@tanstack/react-router'
import { Navbar } from '@/components/features/navbar/navbar'

export function AdminLayout() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
