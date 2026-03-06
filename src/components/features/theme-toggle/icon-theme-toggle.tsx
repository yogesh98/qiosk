import { useTheme } from 'next-themes'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sun02Icon, Moon02Icon } from '@hugeicons/core-free-icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function IconThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    >
      <HugeiconsIcon
        icon={Sun02Icon}
        altIcon={Moon02Icon}
        showAlt={resolvedTheme === 'dark'}
        size={18}
      />
    </button>
  )
}
