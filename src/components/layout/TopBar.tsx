import { HelpCircle, ChevronDown, Globe, Search, LogOut, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useHotelStore } from "@/store/hotel-store";
import { useAuthStore, useCurrentUser } from "@/store/auth-store";
import { logActivity } from "@/store/activity-store";
import { NotificationsBell } from "@/components/system/NotificationsBell";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

const formatToday = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function TopBar(_props: TopBarProps) {
  const settings = useHotelStore((s) => s.settings);
  const updateSettings = useHotelStore((s) => s.updateSettings);
  const openShift = useHotelStore((s) => s.shifts.find((x) => x.status === "open"));
  const me = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  // Render date only after mount to avoid SSR/CSR hydration mismatch
  const [today, setToday] = useState<string>("");
  useEffect(() => setToday(formatToday()), []);

  const displayName = me?.fullName || me?.username || "User";
  const isAdmin = me?.role === "admin";

  const handleLogout = () => {
    logActivity({
      action: "logout",
      entityType: "system",
      description: `Signed out (${displayName})`,
    });
    logout();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-2 sm:gap-3 sm:px-3 md:px-4">
      <SidebarTrigger className="shrink-0 text-foreground" />

      {/* Hotel identity (left) */}
      <div className="flex min-w-0 items-center gap-2">
        {settings.logoDataUrl ? (
          <img
            src={settings.logoDataUrl}
            alt={settings.hotelName}
            className="hidden h-8 w-8 shrink-0 rounded object-contain sm:block"
          />
        ) : (
          <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 sm:flex">
            <span className="text-[10px] font-bold text-primary">
              {settings.hotelCode?.slice(0, 4) || "NXR"}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {settings.hotelName}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            ({settings.hotelCode || "—"})
          </p>
        </div>
      </div>

      {/* Date (center) */}
      <div className="hidden flex-1 justify-center md:flex">
        <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
          {today || "\u00A0"}
        </p>
      </div>

      {/* Right cluster */}
      <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <Select
          value={settings.language ?? "en"}
          onValueChange={(v) => updateSettings({ language: v as "en" | "ar" })}
        >
          <SelectTrigger className="hidden h-8 w-[150px] gap-1 rounded border-border text-xs sm:flex">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="en">English (US)</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-2 rounded border-border text-xs text-muted-foreground sm:flex"
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
            window.dispatchEvent(ev);
          }}
          title="Global search (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </Button>

        <NotificationsBell />
        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded text-xs text-muted-foreground"
          onClick={() => window.dispatchEvent(new CustomEvent("nexora:shortcuts"))}
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Help</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted"
            >
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                  {displayName
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium text-foreground sm:inline">
                {displayName}
              </span>
              <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="flex flex-col">
                <span className="font-semibold">{displayName}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                  {isAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                  {isAdmin ? "Administrator" : "Staff"}
                  {openShift && <> · Shift open</>}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="text-xs">
                <KeyRound className="mr-2 h-3.5 w-3.5" />
                Change password
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/users" className="text-xs">
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Manage users
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/shift-management" className="text-xs">
                Shift Management
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="text-xs">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
