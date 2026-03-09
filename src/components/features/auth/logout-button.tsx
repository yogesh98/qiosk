import { useRouter } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Logout05Icon } from '@hugeicons/core-free-icons'
import { logoutFn } from '@/utils/auth/auth.functions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logoutFn()
    await router.invalidate({ sync: true })
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleLogout}
        className="inline-flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Log out"
      >
        <HugeiconsIcon icon={Logout05Icon} size={18} />
      </TooltipTrigger>
      <TooltipContent>Log out</TooltipContent>
    </Tooltip>
  )
}
