export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!login|ds-preview|api/auth|_next/static|_next/image|favicon\\.ico).*)"],
}
