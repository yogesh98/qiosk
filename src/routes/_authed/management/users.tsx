import { createFileRoute, redirect } from '@tanstack/react-router'
import { listUsersFn } from '@/utils/users/users.functions'
import { UserManagement } from '@/components/pages/management/UserManagement'

export const Route = createFileRoute('/_authed/management/users')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/management/configurations' })
    }
  },
  loader: ({ context }) =>
    listUsersFn().then((users) => ({
      users,
      currentUserId: context.user!.id,
    })),
  component: UserManagement,
})
