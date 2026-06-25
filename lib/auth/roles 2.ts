export type Role = "customer" | "manager";
export type AccessDecision = "allow" | "login" | "deny";

export function routeAccess(pathname: string, role: Role | null): AccessDecision {
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");

  if (isAdmin) {
    if (role === "manager") return "allow";
    if (role === "customer") return "deny";
    return "login";
  }
  if (isAccount) {
    return role ? "allow" : "login";
  }
  return "allow";
}
