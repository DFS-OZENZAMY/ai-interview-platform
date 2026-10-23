import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  const protectedRoute = ["/dashboard", "/onboarding", "/preparation", "/role-preview"].some(
    p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/")
  );
  if (protectedRoute && (error || !data.user)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }
  if (protectedRoute && data.user) {
    const roleResult = await client.from("app_user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
    if (roleResult.error) {
      return new NextResponse("Impossible de vérifier les autorisations.", { status: 503 });
    }
    const elevated = roleResult.data?.role === "admin" || roleResult.data?.role === "coach";
    const isRolePreview = request.nextUrl.pathname.startsWith("/role-preview");
    if (elevated !== isRolePreview) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = elevated ? "/role-preview" : "/dashboard";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/onboarding/:path*", "/preparation/:path*", "/role-preview/:path*"] };
