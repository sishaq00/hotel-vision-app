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
  Settings as SettingsIcon,
  ExternalLink,
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

// Top-level items (always visible) — matches HOTEL KEY layout
const topItems = [
  { key: "nav.dashboard", url: "/", icon: LayoutDashboard },
  { key: "nav.in-house", url: "/in-house", icon: BedDouble },
  { key: "nav.departures", url: "/departures", icon: LogOut },
  { key: "nav.arrivals", url: "/arrivals", icon: CalendarCheck },
  { key: "nav.recently-viewed", url: "/recently-viewed", icon: Eye },
  { key: "nav.availability", url: "/availability", icon: Grid3x3 },
  { key: "nav.search-reservations", url: "/search-reservations", icon: Search },
] as const;

// Bulk Routing & Postings group
const bulkRoutingItems = [
  { key: "nav.bulk-setup", url: "/bulk-routing/setup", icon: Receipt },
  { key: "nav.fast-posting", url: "/bulk-routing/fast-posting", icon: Zap },
] as const;

// "More" expandable group
const moreItems = [
  { key: "nav.archived", url: "/archived-reservations", icon: Archive },
  { key: "nav.batch-process", url: "/batch-process", icon: Layers },
  { key: "nav.group-master", url: "/group-master", icon: Users },
  { key: "nav.guest-profiles", url: "/guests", icon: Users },
  { key: "nav.search-invoice", url: "/search-invoice", icon: FileSearch },
  { key: "nav.open-folios", url: "/open-folios", icon: FolderOpen },
  { key: "nav.maintenance", url: "/maintenance", icon: Wrench },
  { key: "nav.housekeeping", url: "/housekeeping", icon: Sparkles },
  { key: "nav.reminders", url: "/reminders", icon: Bell },
  { key: "nav.night-audit", url: "/night-audit", icon: Moon },
  { key: "nav.house-inventory", url: "/house-inventory", icon: Package },
  { key: "nav.product-inventory", url: "/product-inventory", icon: ShoppingBag },
  { key: "nav.house-accounts", url: "/house-accounts", icon: Wallet },
  { key: "nav.lost-found", url: "/lost-found", icon: PackageSearch },
  { key: "nav.shift-management", url: "/shift-management", icon: Clock },
  { key: "nav.advance-deposits", url: "/advance-deposits", icon: CreditCard },
] as const;

const bottomItems: ReadonlyArray<{
  key: string;
  url: string;
  icon: typeof BarChart3;
  external?: boolean;
}> = [
  { key: "nav.report-queue", url: "/report-queue", icon: ListChecks },
  { key: "nav.reports", url: "/reports", icon: BarChart3, external: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const path = location.pathname;
  const { t } = useT();

  const isActive = (url: string) =>
    url === "/" ? path === "/" : path === url || path.startsWith(url + "/");

  // Auto-open groups if any child matches current route
  const bulkOpen = bulkRoutingItems.some((i) => isActive(i.url));
  const _moreOpen = moreItems.some((i) => isActive(i.url));

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
              {topItems.map((item) => (
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
                  {bulkRoutingItems.map((item) => (
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
                  {moreItems.map((item) => (
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
              {bottomItems.map((item) => (
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

        {/* Audit + Settings (NEXORA additions) */}
        <SidebarGroup className="px-1 py-0 mt-2 border-t border-sidebar-border pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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
