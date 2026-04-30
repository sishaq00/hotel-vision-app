import { HelpCircle, ChevronDown, Globe, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useHotelStore } from "@/store/hotel-store";
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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 md:px-4">
      <SidebarTrigger className="text-foreground" />

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
        <p className="text-sm font-medium text-muted-foreground">{formatToday()}</p>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
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
                  {(openShift?.userName ?? "Front Desk")
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium text-foreground sm:inline">
                {openShift?.userName ?? "Front Desk"}
              </span>
              <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              {openShift ? `Shift open · ${openShift.userName}` : "No active shift"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="text-xs">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/shift-management" className="text-xs">Shift Management</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
