// Sync status badge — shown in TopBar when sync is configured.
import { useSyncState, type SyncStatus } from "@/lib/sync/sync-engine";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

function relativeTime(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 10)  return "just now";
  if (sec < 60)  return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

const STATUS_CFG: Record<SyncStatus, {
  icon: typeof Wifi;
  label: string;
  cls: string;
}> = {
  disconnected: { icon: WifiOff,      label: "Offline mode",   cls: "text-muted-foreground"                               },
  connecting:   { icon: RefreshCw,    label: "Connecting…",    cls: "text-amber-600 dark:text-amber-400 animate-spin"     },
  connected:    { icon: CheckCircle2, label: "Synced",         cls: "text-emerald-600 dark:text-emerald-400"              },
  syncing:      { icon: RefreshCw,    label: "Syncing…",       cls: "text-blue-600 dark:text-blue-400 animate-spin"      },
  error:        { icon: AlertCircle,  label: "Sync error",     cls: "text-rose-600 dark:text-rose-400"                    },
};

export function SyncStatusBadge() {
  const sync = useSyncState();

  // Don't render anything if sync is not configured
  if (!sync.serverUrl && sync.status === "disconnected") return null;

  const cfg = STATUS_CFG[sync.status];
  const Icon = cfg.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[11px] font-medium cursor-default select-none",
            sync.status === "error" && "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
            sync.status === "connected" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
          )}>
            <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.cls)} />
            <span className={cfg.cls}>{cfg.label}</span>
            {sync.pendingChanges > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {sync.pendingChanges}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <p className="font-semibold">{sync.serverUrl ?? "No sync server configured"}</p>
            {sync.lastSyncAt && (
              <p className="text-muted-foreground">Last synced: {relativeTime(sync.lastSyncAt)}</p>
            )}
            {sync.pendingChanges > 0 && (
              <p className="text-amber-600">{sync.pendingChanges} pending change{sync.pendingChanges > 1 ? "s" : ""}</p>
            )}
            {sync.error && <p className="text-rose-600">{sync.error}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
