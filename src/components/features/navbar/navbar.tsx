import { Link } from '@tanstack/react-router'
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
        <div className="ml-4 flex items-center">
          <Link
            to="/admin/configurations"
            className="rounded-full px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white [&.active]:bg-black/10 [&.active]:text-gray-900 dark:[&.active]:bg-white/15 dark:[&.active]:text-white"
          >
            configurations
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconThemeToggle />
          <LogoutButton />
        </div>
      </nav>
    </header>
  )
}
