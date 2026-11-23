/**
 * proxy.ts runs on the server BEFORE a page is shown (Next.js 16's new name
 * for "middleware"). Two jobs:
 *
 * 1. Keep the sign-in fresh. Supabase sign-ins expire after about an hour
 *    and are renewed with a "refresh token"; doing that here means every
 *    page sees an up-to-date sign-in cookie.
 * 2. Send people to the right place:
 *    - signed out + a page that needs an account (settings) → /signin?next=…
 *    - signed in + sign-in / sign-up                        → /tests
 *    The landing page "/" opens for everyone.
 *    Guests may use My tests, the editor and print (tests stay in their browser).
 *
 * This is about convenience. The real protection of the data is Row Level
 * Security in the database: without a valid sign-in it returns nothing.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SIGNED_OUT_ONLY, isProtectedPath } from "@/lib/auth/routes";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  // Before .env.local is filled in, the pages show setup help instead.
  if (!supabaseConfigured) return NextResponse.next();

  // Sandbox only (local testing with a pretend database, see lib/server/sandbox.ts):
  // remember whether a sign-in cookie arrived, before Supabase looks at it.
  const sandbox = process.env.MATHTEST_SANDBOX === "1";
  const hadCookie = sandbox && request.cookies.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        // Renewed sign-in cookies: give them to the page AND the browser.
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() checks the sign-in's signature (and renews it if needed).
  const { data } = await supabase.auth.getClaims();
  let signedIn = Boolean(data?.claims?.sub);
  if (!signedIn && hadCookie) {
    // The browser tests use a made-up sign-in that Supabase can't confirm. In the
    // sandbox there is no real data to protect, so the page may open — and the
    // cookie is left alone (a fresh response, without Supabase's "clear it").
    signedIn = true;
    response = NextResponse.next();
  }
  const { pathname, search } = request.nextUrl;

  const redirect = (to: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
    const res = NextResponse.redirect(url);
    // Keep any renewed cookies on the redirect, too.
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (!signedIn && isProtectedPath(pathname)) {
    return redirect("/signin", { next: pathname + search });
  }
  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return redirect("/tests");
  }
  return response;
}

export const config = {
  // Every page, but not static files, images, the PDF API or the sign-in callback.
  matcher: ["/((?!_next/static|_next/image|api/|auth/callback|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|css|js)$).*)"],
};
