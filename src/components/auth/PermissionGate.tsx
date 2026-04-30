import type { ReactNode } from "react";
import { usePermission } from "@/store/auth-store";
import type { Permission } from "@/lib/permissions";
import { Lock } from "lucide-react";

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, render nothing instead of the default denied card */
  silent?: boolean;
}

export function PermissionGate({
  permission,
  children,
  fallback,
  silent,
}: PermissionGateProps) {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;
  if (silent) return null;
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Permission required
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You don&apos;t have access to this section. Ask your administrator to
          grant the <code className="rounded bg-muted px-1 py-0.5 text-xs">{permission}</code> permission.
        </p>
      </div>
    </div>
  );
}
