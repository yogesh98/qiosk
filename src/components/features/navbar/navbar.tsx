import { IconThemeToggle } from '@/components/features/theme-toggle/icon-theme-toggle'
import { LogoutButton } from '@/components/features/auth/logout-button'

export function Navbar() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <nav className="flex items-center rounded-full bg-gray-200 py-1.5 pr-2 pl-2 shadow-xl shadow-black/10 dark:bg-gray-800 dark:shadow-black/25">
        <img
          src="/kiosk_pilot_logo_black.png"
          alt="Qiosk"
          className="ml-2 h-6 dark:hidden"
        />
        <img
          src="/kiosk_pilot_logo_white.png"
          alt="Qiosk"
          className="ml-2 hidden h-6 dark:block"
        />
        <div className="ml-auto flex items-center gap-1">
          <IconThemeToggle />
          <LogoutButton />
        </div>
      </nav>
    </header>
  )
}
