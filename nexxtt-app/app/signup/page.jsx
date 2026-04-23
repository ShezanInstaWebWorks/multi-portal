import { SignupClient } from "./SignupClient";

export const metadata = {
  title: "Sign up · nexxtt.io",
  robots: "noindex, nofollow",
};

export default async function SignupPage({ searchParams }) {
  const resolved = (await searchParams) ?? {};
  const initialTab = resolved.as === "direct" ? "direct" : "agency";
  return <SignupClient initialTab={initialTab} />;
}
