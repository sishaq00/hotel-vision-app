import {
  LayoutDashboard, BedDouble, LogIn, LogOut, Users, CalendarCheck,
  Eye, Grid3x3, Search, Receipt, Zap, Archive, Layers, FileSearch,
  FolderOpen, Wrench, Sparkles, Bell, Moon, Package, ShoppingBag,
  Wallet, PackageSearch, Clock, CreditCard, BarChart3, History,
  Printer, Settings as SettingsIcon, Tag, MessageSquareText,
  ShieldCheck, UserCog, FileMinus, Percent, ChevronRight, Hotel,
  ListChecks, Inbox,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useAuthStore, useCurrentUser } from "@/store/auth-store";
import { useHotelStore } from "@/store/hotel-store";
import type { Permission } from "@/lib/permissions";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logActivity } from "@/store/activity-store";
import { useNavigate } from "@tanstack/react-router";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  badge?: () => number;
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

// ─── Nav item component ───────────────────────────────────────────────────────

function NavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasPermission } = useAuthStore();
  const badge = item.badge?.() ?? 0;

  if (item.permission && !hasPermission(item.permission)) return null;

  const active = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
  const Icon = item.icon;

  return (
    <Link
      to={item.url}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <span className={cn(
          "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ─── Collapsible nav group ────────────────────────────────────────────────────

function NavGroup({ group }: { group: NavGroup }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasPermission } = useAuthStore();

  const visibleItems = group.items.filter(
    (it) => !it.permission || hasPermission(it.permission),
  );
  if (!visibleItems.length) return null;

  const hasActive = visibleItems.some(
    (it) => pathname === it.url || (it.url !== "/" && pathname.startsWith(it.url)),
  );
  const [open, setOpen] = useState(group.defaultOpen || hasActive);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground"
      >
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="space-y-0.5 px-1">
          {visibleItems.map((it) => <NavLink key={it.url} item={it} />)}
        </div>
      )}
    </div>
  );
}

// ─── Nav groups definition ────────────────────────────────────────────────────

function useNavGroups(): NavGroup[] {
  const reservations = useHotelStore((s) => s.reservations);
  const { t } = useT();

  const arrivalsToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    return reservations.filter((r) => r.checkIn === today && r.status === "confirmed").length;
  };
  const departuresToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    return reservations.filter((r) => r.checkOut === today && r.status === "checked-in").length;
  };
  const inHouseCount = () => reservations.filter((r) => r.status === "checked-in").length;

  return [
    {
      title: "Front Desk",
      defaultOpen: true,
      items: [
        { label: t("nav.dashboard"),       url: "/",              icon: LayoutDashboard, permission: "dashboard.view" },
        { label: t("nav.in-house"),        url: "/in-house",      icon: BedDouble,       permission: "reservations.view", badge: inHouseCount },
        { label: t("nav.arrivals"),        url: "/arrivals",      icon: LogIn,           permission: "reservations.view", badge: arrivalsToday },
        { label: t("nav.departures"),      url: "/departures",    icon: LogOut,          permission: "reservations.view", badge: departuresToday },
        { label: t("nav.availability"),    url: "/availability",  icon: Grid3x3,         permission: "rooms.view" },
        { label: t("nav.recently-viewed"), url: "/recently-viewed", icon: Eye,           permission: "reservations.view" },
      ],
    },
    {
      title: "Reservations",
      items: [
        { label: t("nav.search-reservations"), url: "/search-reservations", icon: Search,       permission: "reservations.view" },
        { label: t("nav.group-master"),        url: "/group-master",        icon: Users,        permission: "reservations.view" },
        { label: t("nav.guest-profiles"),      url: "/guests",              icon: UserCog,      permission: "guests.view" },
        { label: t("nav.archived"),            url: "/archived-reservations", icon: Archive,    permission: "reservations.view" },
        { label: t("nav.batch-process"),       url: "/batch-process",       icon: Layers,       permission: "reservations.edit" },
        { label: "Bulk Routing",               url: "/bulk-routing/setup",  icon: Receipt,      permission: "reservations.edit" },
        { label: "Fast Posting",               url: "/bulk-routing/fast-posting", icon: Zap,    permission: "payments.record" },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: t("nav.shift-management"),  url: "/shift-management",  icon: Clock,        permission: "shifts.manage" },
        { label: t("nav.advance-deposits"),  url: "/advance-deposits",  icon: CreditCard,   permission: "payments.view" },
        { label: t("nav.house-accounts"),    url: "/house-accounts",    icon: Wallet,       permission: "payments.view" },
        { label: t("nav.open-folios"),       url: "/open-folios",       icon: FolderOpen,   permission: "payments.view" },
        { label: t("nav.search-invoice"),    url: "/search-invoice",    icon: FileSearch,   permission: "payments.view" },
        { label: "Credit Notes",             url: "/credit-notes",      icon: FileMinus,    permission: "payments.view" },
        { label: "Discount Codes",           url: "/discount-codes",    icon: Percent,      permission: "rooms.manage" },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: t("nav.housekeeping"),       url: "/housekeeping",      icon: Sparkles,     permission: "housekeeping.view" },
        { label: "My Rooms (HK)",             url: "/my-housekeeping",   icon: Sparkles,     permission: "housekeeping.update" },
        { label: t("nav.maintenance"),        url: "/maintenance",       icon: Wrench,       permission: "maintenance.manage" },
        { label: t("nav.lost-found"),         url: "/lost-found",        icon: PackageSearch },
        { label: t("nav.reminders"),          url: "/reminders",         icon: Bell },
        { label: t("nav.house-inventory"),    url: "/house-inventory",   icon: Package,      permission: "rooms.manage" },
        { label: t("nav.product-inventory"),  url: "/product-inventory", icon: ShoppingBag,  permission: "rooms.manage" },
      ],
    },
    {
      title: "Reports & Audit",
      items: [
        { label: t("nav.night-audit"),   url: "/night-audit",   icon: Moon,        permission: "night-audit.run" },
        { label: t("nav.report-queue"),  url: "/report-queue",  icon: ListChecks,  permission: "reports.view" },
        { label: "Reports",              url: "/reports",       icon: BarChart3,   permission: "reports.view" },
        { label: "Audit Log",            url: "/audit-log",     icon: History,     permission: "audit.view" },
        { label: "User Activity",        url: "/user-activity", icon: Eye,         permission: "audit.view" },
        { label: "Print Log",            url: "/print-log",     icon: Printer,     permission: "reports.view" },
      ],
    },
    {
      title: "Setup",
      items: [
        { label: t("nav.rooms"),      url: "/rooms",       icon: BedDouble,      permission: "rooms.manage" },
        { label: "Room Types",        url: "/room-types",  icon: BedDouble,      permission: "rooms.manage" },
        { label: t("nav.rate-plans"), url: "/rate-plans",  icon: Tag,            permission: "rooms.manage" },
        { label: t("nav.templates"),  url: "/templates",   icon: MessageSquareText },
        { label: "Users",             url: "/users",       icon: ShieldCheck,    permission: "users.manage" },
        { label: "Settings",          url: "/settings",    icon: SettingsIcon },
      ],
    },
  ];
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const settings  = useHotelStore((s) => s.settings);
  const me        = useCurrentUser();
  const logout    = useAuthStore((s) => s.logout);
  const navigate  = useNavigate();
  const navGroups = useNavGroups();
  const openShift = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));

  const displayName = me?.fullName || me?.username || "User";
  const initials = displayName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logActivity({ action: "logout", entityType: "system", description: `Signed out (${displayName})` });
    logout();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-card">
      {/* Header */}
      <SidebarHeader className="border-b border-border/60 px-3 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            {settings.hotelCode?.slice(0, 3) || "NXR"}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {settings.hotelName || "NEXORA OS"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Hotel Management
              </p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="px-2 py-2">
        {navGroups.map((g) =>
          collapsed ? (
            // Collapsed: show icons only
            <div key={g.title} className="space-y-0.5 px-1">
              {g.items.map((it) => <NavLink key={it.url} item={it} />)}
            </div>
          ) : (
            <NavGroup key={g.title} group={g} />
          ),
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/60 p-2">
        {/* Shift indicator */}
        {openShift && !collapsed && (
          <div className="mb-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/30">
            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              Shift open · {openShift.userName}
            </p>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-accent",
                collapsed && "justify-center",
              )}
            >
              <Avatar className="h-7 w-7 shrink-0 border border-border">
                <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{me?.role}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="text-xs">Change password</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/shift-management" className="text-xs">Shift management</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="text-xs">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
