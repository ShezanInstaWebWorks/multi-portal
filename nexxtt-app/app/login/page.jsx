import { LoginClient } from "./LoginClient";

export const metadata = {
  title: "Sign in · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function LoginPage({ searchParams }) {
  const resolved = (await searchParams) ?? {};
  const referredByCode = typeof resolved.ref === "string" ? resolved.ref : null;
  // Only accept relative paths to avoid open-redirect via `?next=https://evil`.
  const rawNext = typeof resolved.next === "string" ? resolved.next : null;
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  return <LoginClient referredByCode={referredByCode} nextPath={nextPath} />;
}
