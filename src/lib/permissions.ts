// Centralized permission catalogue for the offline RBAC system.
export const PERMISSIONS = [
  // Dashboard / global
  "dashboard.view",

  // Reservations
  "reservations.view",
  "reservations.create",
  "reservations.edit",
  "reservations.cancel",
  "reservations.extend",

  // Front desk operations
  "checkin.perform",
  "checkout.perform",

  // Rooms & guests
  "rooms.view",
  "rooms.manage",
  "guests.view",
  "guests.manage",

  // Operations
  "housekeeping.view",
  "housekeeping.update",
  "maintenance.manage",

  // Money
  "payments.view",
  "payments.record",
  "payments.refund",

  // Reports
  "reports.view",
  "reports.export",
  "reports.user-activity",

  // Closing day
  "night-audit.run",
  "shifts.manage",

  // Admin only
  "users.manage",
  "settings.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: Array<{
  label: string;
  items: { key: Permission; label: string }[];
}> = [
  {
    label: "Dashboard",
    items: [{ key: "dashboard.view", label: "View dashboard" }],
  },
  {
    label: "Reservations",
    items: [
      { key: "reservations.view", label: "View reservations" },
      { key: "reservations.create", label: "Create reservation" },
      { key: "reservations.edit", label: "Edit reservation" },
      { key: "reservations.cancel", label: "Cancel reservation" },
      { key: "reservations.extend", label: "Extend stay (add nights)" },
    ],
  },
  {
    label: "Front Desk",
    items: [
      { key: "checkin.perform", label: "Perform check-in" },
      { key: "checkout.perform", label: "Perform check-out" },
    ],
  },
  {
    label: "Rooms & Guests",
    items: [
      { key: "rooms.view", label: "View rooms" },
      { key: "rooms.manage", label: "Manage rooms (add/edit/status)" },
      { key: "guests.view", label: "View guests" },
      { key: "guests.manage", label: "Manage guests" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "housekeeping.view", label: "View housekeeping" },
      { key: "housekeeping.update", label: "Update housekeeping" },
      { key: "maintenance.manage", label: "Manage maintenance" },
    ],
  },
  {
    label: "Payments (Cash)",
    items: [
      { key: "payments.view", label: "View payments" },
      { key: "payments.record", label: "Record payment" },
      { key: "payments.refund", label: "Refund payment" },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.export", label: "Export reports" },
      { key: "reports.user-activity", label: "View user activity report" },
    ],
  },
  {
    label: "Closing & Shifts",
    items: [
      { key: "night-audit.run", label: "Run Night Audit" },
      { key: "shifts.manage", label: "Manage shifts" },
    ],
  },
  {
    label: "Administration (Admin only)",
    items: [
      { key: "users.manage", label: "Manage users & permissions" },
      { key: "settings.manage", label: "Manage hotel settings" },
      { key: "audit.view", label: "View audit log" },
    ],
  },
];

// Default permissions granted to a brand-new staff user
export const DEFAULT_STAFF_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "reservations.view",
  "reservations.create",
  "reservations.extend",
  "checkin.perform",
  "checkout.perform",
  "rooms.view",
  "guests.view",
  "guests.manage",
  "housekeeping.view",
  "housekeeping.update",
  "payments.view",
  "payments.record",
  "shifts.manage",
];

export function isAdmin(role: string): boolean {
  return role === "admin";
}
