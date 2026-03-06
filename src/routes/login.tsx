import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/components/pages/login'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/admin/configurations' })
    }
  },
  component: LoginPage,
})
