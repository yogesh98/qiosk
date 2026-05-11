"use client"

import * as React from "react"

import { logoutAction } from "@/app/login/actions"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  CaretUpDownIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "qiosk-theme"

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function NavUser({
  user,
}: {
  user: {
    name: string
  }
}) {
  const { isMobile } = useSidebar()
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark"
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === "light" ? "light" : "dark"
  })

  React.useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleThemeChange(nextTheme: Theme) {
    setTheme(nextTheme)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarFallback>
                <UserCircleIcon />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">Settings</span>
            </div>
            <CaretUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>
                      <UserCircleIcon />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">Signed in</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Appearance</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={theme === "light"}
                onClick={() => handleThemeChange("light")}
              >
                <SunIcon />
                Light mode
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={theme === "dark"}
                onClick={() => handleThemeChange("dark")}
              >
                <MoonIcon />
                Dark mode
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <form action={logoutAction}>
                <DropdownMenuItem
                  nativeButton
                  variant="destructive"
                  render={<button type="submit" className="w-full" />}
                >
                  <SignOutIcon />
                  Log out
                </DropdownMenuItem>
              </form>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
