import { useSession } from '@tanstack/react-start/server'

export type SessionData = {
  userId?: string
  userEmail?: string
  role?: string
}

export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!, // 32+ chars
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  })
}