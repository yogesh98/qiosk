"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  CommandIcon,
  MonitorIcon,
  PaintBrushIcon,
  StackIcon,
} from "@phosphor-icons/react"

const data = {
  navMain: [
    {
      title: "Styles",
      url: "/dashboard/styles",
      icon: <PaintBrushIcon />,
    },
    {
      title: "Templates",
      url: "/dashboard/templates",
      icon: <StackIcon />,
    },
    {
      title: "Displays",
      url: "/dashboard/displays",
      icon: <MonitorIcon />,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentUser: {
    name: string
  }
}

export function AppSidebar({
  currentUser,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CommandIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Qiosk</span>
                <span className="truncate text-xs">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
