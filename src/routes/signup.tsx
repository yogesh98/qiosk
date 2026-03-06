import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignupPage } from '@/components/pages/signup'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/' })
    }
  },
  component: SignupPage,
})
