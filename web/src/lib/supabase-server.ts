import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_PROVIDER } from "@/lib/auth-provider";
import { createPlatformClient } from "@/lib/platform-auth";
import { serverCall } from "@/lib/platform-upstream";

export async function getServerAuthClient() {
  if (AUTH_PROVIDER === "platform") return createPlatformClient(serverCall((await cookies()).getAll().map(c => `${c.name}=${c.value}`).join("; ")));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot mutate cookies; Proxy refreshes sessions. */ }
      },
    },
  });
}
