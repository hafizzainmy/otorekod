import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Initialize Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Retrieve current logged in user status
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Define route rules
  const isDashboardRoute = url.pathname.startsWith("/dashboard");
  const isLoginRoute = url.pathname.startsWith("/login");

  // RULE 1: If user is NOT logged in and tries to access dashboard, redirect to login page
  if (isDashboardRoute && !user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // RULE 2: If user IS logged in and tries to go to login page, redirect them straight to their dashboard
  if (isLoginRoute && user) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // All other pages (like Home Page '/' or Public Passports '/shared') are completely public
  return response;
}

// Ensure the middleware matches all pages except static media
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};