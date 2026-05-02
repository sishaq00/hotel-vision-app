import {
  LayoutDashboard,
  BedDouble,
  LogOut,
  CalendarCheck,
  Eye,
  Grid3x3,
  Search,
  Receipt,
  Zap,
  ChevronDown,
  MoreHorizontal,
  Archive,
  Layers,
  Users,
  FileSearch,
  FolderOpen,
  Wrench,
  Sparkles,
  Bell,
  Moon,
  Package,
  ShoppingBag,
  Wallet,
  PackageSearch,
  Clock,
  CreditCard,
  ListChecks,
  BarChart3,
  GraduationCap,
  Hotel,
  History,
  Printer,
  Settings as SettingsIcon,
  ExternalLink,
  Tag,
  MessageSquareText,
  ShieldCheck,
  UserCog,
  FileMinus,
  Percent,
  Pencil,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useT } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth-store";
import type { Permission } from "@/lib/permissions";

type NavItem = {
  key: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  external?: boolean;
};

const topItems: ReadonlyArray<NavItem> = [
  { key: "nav.dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { key: "nav.in-house", url: "/in-house", icon: BedDouble, permission: "reservations.view" },
  { key: "nav.departures", url: "/departures", icon: LogOut, permission: "reservations.view" },
  { key: "nav.arrivals", url: "/arrivals", icon: CalendarCheck, permission: "reservations.view" },
  { key: "nav.recently-viewed", url: "/recently-viewed", icon: Eye, permission: "reservations.view" },
  { key: "nav.availability", url: "/availability", icon: Grid3x3, permission: "rooms.view" },
  { key: "nav.search-reservations", url: "/search-reservations", icon: Search, permission: "reservations.view" },
];

const bulkRoutingItems: ReadonlyArray<NavItem> = [
  { key: "nav.bulk-setup", url: "/bulk-routing/setup", icon: Receipt, permission: "reservations.edit" },
  { key: "nav.fast-posting", url: "/bulk-routing/fast-posting", icon: Zap, permission: "payments.record" },
];

const moreItems: ReadonlyArray<NavItem> = [
  { key: "nav.archived", url: "/archived-reservations", icon: Archive, permission: "reservations.view" },
  { key: "nav.batch-process", url: "/batch-process", icon: Layers, permission: "reservations.edit" },
  { key: "nav.group-master", url: "/group-master", icon: Users, permission: "reservations.view" },
  { key: "nav.guest-profiles", url: "/guests", icon: Users, permission: "guests.view" },
  { key: "nav.search-invoice", url: "/search-invoice", icon: FileSearch, permission: "payments.view" },
  { key: "Credit Notes", url: "/credit-notes", icon: FileMinus, permission: "payments.view" },
  { key: "nav.open-folios", url: "/open-folios", icon: FolderOpen, permission: "payments.view" },
  { key: "nav.maintenance", url: "/maintenance", icon: Wrench, permission: "maintenance.manage" },
  { key: "nav.housekeeping", url: "/housekeeping", icon: Sparkles, permission: "housekeeping.view" },
  { key: "My Rooms (HK)", url: "/my-housekeeping", icon: Sparkles, permission: "housekeeping.update" },
  { key: "nav.reminders", url: "/reminders", icon: Bell },
  { key: "nav.night-audit", url: "/night-audit", icon: Moon, permission: "night-audit.run" },
  { key: "nav.house-inventory", url: "/house-inventory", icon: Package, permission: "rooms.manage" },
  { key: "nav.product-inventory", url: "/product-inventory", icon: ShoppingBag, permission: "rooms.manage" },
  { key: "nav.house-accounts", url: "/house-accounts", icon: Wallet, permission: "payments.view" },
  { key: "nav.lost-found", url: "/lost-found", icon: PackageSearch },
  { key: "nav.shift-management", url: "/shift-management", icon: Clock, permission: "shifts.manage" },
  { key: "nav.advance-deposits", url: "/advance-deposits", icon: CreditCard, permission: "payments.view" },
  { key: "nav.rate-plans", url: "/rate-plans", icon: Tag, permission: "rooms.manage" },
  { key: "Discount Codes", url: "/discount-codes", icon: Percent, permission: "rooms.manage" },
  { key: "nav.templates", url: "/templates", icon: MessageSquareText },
];

const bottomItems: ReadonlyArray<NavItem> = [
  { key: "nav.report-queue", url: "/report-queue", icon: ListChecks, permission: "reports.view" },
  { key: "User Activity", url: "/reports/user-activity", icon: BarChart3, permission: "reports.user-activity" },
  { key: "nav.reports", url: "/reports", icon: BarChart3, permission: "reports.view", external: true },
];

const adminItems: ReadonlyArray<NavItem> = [
  { key: "Users & Permissions", url: "/users", icon: UserCog, permission: "users.manage" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const path = location.pathname;
  const { t } = useT();
  const me = useAuthStore((s) =>
    s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) ?? null : null,
  );

  const can = (perm?: Permission) => {
    if (!perm) return true;
    if (!me || !me.active) return false;
    if (me.role === "admin") return true;
    return me.permissions.includes(perm);
  };

  const filterNav = (items: ReadonlyArray<NavItem>) => items.filter((i) => can(i.permission));

  const visibleTop = filterNav(topItems);
  const visibleBulk = filterNav(bulkRoutingItems);
  const visibleMore = filterNav(moreItems);
  const visibleBottom = filterNav(bottomItems);
  const visibleAdmin = filterNav(adminItems);

  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

  const bulkOpen = visibleBulk.some((i) => isActive(i.url));

  const [bulkExpanded, setBulkExpanded] = useState<boolean>(bulkOpen);
  const [moreExpanded, setMoreExpanded] = useState<boolean>(true);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Hotel className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">
                {t("app.name")}
              </p>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {t("nav.hotel-suite")}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-1 py-2">
        {/* Top items */}
        <SidebarGroup className="px-1 py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleTop.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    tooltip={t(item.key)}
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive(item.url) &&
                        "border-l-2 border-primary bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bulk Routing and Postings */}
        <SidebarGroup className="px-1 py-0">
          <Collapsible open={bulkExpanded} onOpenChange={setBulkExpanded}>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    tooltip={t("nav.bulk-routing")}
                  >
                    <Receipt className="h-4 w-4 shrink-0" />
                    <span>{t("nav.bulk-routing")}</span>
                    <ChevronDown
                      className={cn(
                        "ml-auto h-3.5 w-3.5 transition-transform",
                        bulkExpanded && "rotate-180",
                      )}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
              <CollapsibleContent>
                <SidebarMenuSub className="mr-0 ml-3 border-sidebar-border pl-2">
                  {visibleBulk.map((item) => (
                    <SidebarMenuSubItem key={item.key}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive(item.url)}
                        className="text-[12px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                      >
                        <Link to={item.url}>
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{t(item.key)}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenu>
          </Collapsible>
        </SidebarGroup>

        {/* More */}
        <SidebarGroup className="px-1 py-0">
          <Collapsible open={moreExpanded} onOpenChange={setMoreExpanded}>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    tooltip={t("nav.more")}
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span>{t("nav.more")}</span>
                    <ChevronDown
                      className={cn(
                        "ml-auto h-3.5 w-3.5 transition-transform",
                        moreExpanded && "rotate-180",
                      )}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
              <CollapsibleContent>
                <SidebarMenuSub className="mr-0 ml-3 border-sidebar-border pl-2">
                  {visibleMore.map((item) => (
                    <SidebarMenuSubItem key={item.key}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive(item.url)}
                        className="text-[12px] text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
                      >
                        <Link to={item.url}>
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{t(item.key)}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenu>
          </Collapsible>
        </SidebarGroup>

        {/* Reports section */}
        <SidebarGroup className="px-1 py-0 mt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleBottom.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    tooltip={t(item.key)}
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive(item.url) &&
                        "border-l-2 border-primary bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{t(item.key)}</span>
                      {item.external && (
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section — only visible to users with admin permissions */}
        {visibleAdmin.length > 0 && (
          <SidebarGroup className="px-1 py-0 mt-2 border-t border-sidebar-border pt-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {visibleAdmin.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.key}
                      className={cn(
                        "h-8 rounded text-[13px] text-sidebar-foreground/90",
                        "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        isActive(item.url) &&
                          "border-l-2 border-primary bg-sidebar-accent text-sidebar-foreground font-medium",
                      )}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.key}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Audit + Settings (NEXORA additions) */}
        <SidebarGroup className="px-1 py-0 mt-2 border-t border-sidebar-border pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {can("audit.view") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t("nav.audit")}
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive("/audit") && "bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to="/audit">
                      <History className="h-4 w-4" />
                      <span>{t("nav.audit")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {can("audit.view") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Print Log"
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive("/print-log") && "bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to="/print-log">
                      <Printer className="h-4 w-4" />
                      <span>Print Log</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {can("audit.view") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Rate Overrides"
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive("/rate-overrides") && "bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to="/rate-overrides">
                      <Pencil className="h-4 w-4" />
                      <span>Rate Overrides</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {can("settings.manage") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t("nav.settings")}
                    className={cn(
                      "h-8 rounded text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isActive("/settings") && "bg-sidebar-accent text-sidebar-foreground font-medium",
                    )}
                  >
                    <Link to="/settings">
                      <SettingsIcon className="h-4 w-4" />
                      <span>{t("nav.settings")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-3 py-2">
        {!collapsed && (
          <button
            type="button"
            className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>TrainKey</span>
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
