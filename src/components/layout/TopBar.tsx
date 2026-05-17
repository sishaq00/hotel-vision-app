import {
  HelpCircle, Globe, Search, LogOut, KeyRound,
  ShieldCheck, AlertTriangle, Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useHotelStore, todayISO } from "@/store/hotel-store";
import { useAuthStore, useCurrentUser } from "@/store/auth-store";
import { logActivity } from "@/store/activity-store";
import { NotificationsBell } from "@/components/system/NotificationsBell";
import { SyncStatusBadge } from "@/components/system/SyncStatusBadge";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const formatToday = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

export function TopBar(_props: { title?: string; subtitle?: string } = {}) {
  const settings       = useHotelStore((s) => s.settings);
  const updateSettings = useHotelStore((s) => s.updateSettings);
  const reservations   = useHotelStore((s) => s.reservations);
  const openShift      = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));
  const me             = useCurrentUser();
  const logout         = useAuthStore((s) => s.logout);
  const navigate       = useNavigate();

  const [today, setToday] = useState("");
  useEffect(() => setToday(formatToday()), []);

  const displayName = me?.fullName || me?.username || "User";
  const initials    = displayName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const isAdmin     = me?.role === "admin";

  // Live alert counts
  const todayStr    = todayISO();
  const overdueOuts = reservations.filter((r) => r.checkOut < todayStr && r.status === "checked-in").length;
  const pendingCI   = reservations.filter((r) => r.checkIn === todayStr && r.status === "confirmed").length;

  const handleLogout = () => {
    logActivity({ action: "logout", entityType: "system", description: `Signed out (${displayName})` });
    logout();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-card/95 px-3 backdrop-blur-sm md:px-4">
      <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />

      {/* Date */}
      <p className="hidden text-sm text-muted-foreground md:block" suppressHydrationWarning>
        {today || "\u00A0"}
      </p>

      {/* Search */}
      <button
        type="button"
        className="hidden h-8 flex-1 max-w-xs items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-xs text-muted-foreground hover:bg-muted sm:flex"
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {/* Right cluster */}
      <div className="ms-auto flex shrink-0 items-center gap-1.5">

        {/* Overdue checkouts alert */}
        {overdueOuts > 0 && (
          <Link to="/departures">
            <Badge variant="destructive" className="hidden gap-1 text-[11px] sm:flex">
              <AlertTriangle className="h-3 w-3" />
              {overdueOuts} overdue
            </Badge>
          </Link>
        )}

        {/* Pending arrivals */}
        {pendingCI > 0 && (
          <Link to="/arrivals">
            <Badge className="hidden gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 text-[11px] sm:flex">
              {pendingCI} arriving
            </Badge>
          </Link>
        )}

        {/* Shift badge */}
        {openShift ? (
          <Link to="/shift-management">
            <Badge variant="outline" className="hidden gap-1.5 text-[11px] sm:flex">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">Shift open</span>
            </Badge>
          </Link>
        ) : (
          <Badge variant="outline" className="hidden gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <Clock className="h-3 w-3" />
            No shift
          </Badge>
        )}

        {/* Language */}
        <Select
          value={settings.language ?? "en"}
          onValueChange={(v) => updateSettings({ language: v as "en" | "ar" })}
        >
          <SelectTrigger className="hidden h-8 w-[110px] text-xs sm:flex">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
          </SelectContent>
        </Select>

        <SyncStatusBadge />
        <NotificationsBell />
        <ThemeToggle />

        {/* Help */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => window.dispatchEvent(new CustomEvent("nexora:shortcuts"))}
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium text-foreground sm:block">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{displayName}</span>
                <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                  {isAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                  {isAdmin ? "Administrator" : "Staff"}
                  {openShift && <> · <span className="text-emerald-600">Shift open</span></>}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="text-xs">
                <KeyRound className="mr-2 h-3.5 w-3.5" />Change password
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/users" className="text-xs">
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />Manage users
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/settings" className="text-xs">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-3.5 w-3.5" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
