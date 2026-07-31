// Mock staff identity, kept ONLY for the (admin) pages that are still mock — the episode
// review queue stamps its local audit rows with this name and role.
//
// IT NO LONGER GATES ANYTHING. `AdminStaffGate` reads `GET /admin/whoami` and decides who
// gets into the console; `hasStaffAccess` was deleted with the gate that called it. Do not
// reintroduce a role check here — this file cannot answer that question.

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
