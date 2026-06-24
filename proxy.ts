import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { routeAccess, type Role } from "@/lib/auth/roles";

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  let role: Role | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as Role | undefined) ?? "customer";
  }

  const decision = routeAccess(path, role);

  if (decision === "login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (decision === "deny") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

// Scoped to guarded routes ONLY — never runs on configurator/static/other paths.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
