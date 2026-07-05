// Mock staff identity for the (admin) surface (UI phase — no real auth).
// Flip `role` to "user" to preview the access-denied panel. Display-only:
// the real gate is server-side RBAC, added with backend integration.

export type StaffRole = "user" | "moderator" | "admin";

export type MockStaffMember = {
  fullName: string;
  email: string;
  role: StaffRole;
};

export const MOCK_CURRENT_STAFF_MEMBER: MockStaffMember = {
  fullName: "Vidyesh Churi",
  email: "vidyesh95@gmail.com",
  role: "admin",
};

// Videos have no creator field yet (awaits real auth) — every review row
// shows this stand-in creator name.
export const MOCK_CREATOR_NAME = "Aki Films";

export function hasStaffAccess(role: StaffRole): boolean {
  return role === "moderator" || role === "admin";
}
