import { Outlet, useRouteContext } from '@tanstack/react-router'
import { Navbar } from '@/components/features/navbar/navbar'

export function ManagementLayout() {
  const { user } = useRouteContext({ from: '__root__' })
  return (
    <div className="min-h-svh bg-background">
      <Navbar user={user ?? undefined} />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
