import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { IconThemeToggle } from '@/components/features/theme-toggle/icon-theme-toggle'

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background">
      <div className="absolute top-4 right-4">
        <IconThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-8">
        <img
          src="/kiosk_pilot_logo_black.png"
          alt="Kiosk Pilot"
          className="h-24 dark:hidden"
        />
        <img
          src="/kiosk_pilot_logo_white.png"
          alt="Kiosk Pilot"
          className="hidden h-24 dark:block"
        />

        <div className="flex gap-3">
          <Button size="lg" nativeButton={false} render={<Link to="/login" />}>
            Log in
          </Button>
          <Button size="lg" nativeButton={false} render={<Link to="/signup" />}>
            Sign up
          </Button>
        </div>
      </div>
    </div>
  )
}
