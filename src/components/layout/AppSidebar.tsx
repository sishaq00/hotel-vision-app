import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Tag,
  Users,
  CreditCard,
  BarChart3,
  History,
  Settings,
  Hotel,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Reservations", url: "/reservations", icon: CalendarCheck },
  { title: "Rooms", url: "/rooms", icon: BedDouble },
  { title: "Room Types", url: "/room-types", icon: Tag },
  { title: "Guests", url: "/guests", icon: Users },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Audit Log", url: "/audit", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const path = location.pathname;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Hotel className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-none text-sidebar-foreground">
                NEXORA OS
              </p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Hotel Suite
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive =
                  item.url === "/" ? path === "/" : path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        "h-10 rounded-lg text-sidebar-foreground/80 transition-all",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        isActive &&
                          "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
