import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Tailwind, Text,
} from "@react-email/components";

/**
 * Referral partner payout confirmation. Sent monthly after pending commissions
 * are moved to paid.
 *
 * Props:
 *   partnerName, periodMonth ("2026-04"), amountCents, entryCount, link
 */
export function CommissionPaidEmail({
  partnerName, periodMonth, amountCents, entryCount, link,
}) {
  const amount = `$${((amountCents ?? 0) / 100).toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
  const period = periodMonth
    ? new Date(periodMonth + "-01").toLocaleDateString("en-AU", { month: "long", year: "numeric" })
    : "this cycle";

  return (
    <Html>
      <Head />
      <Preview>Your {amount} commission payout is on the way</Preview>
      <Tailwind>
        <Body style={{ background: "#f0f2f5", margin: 0, padding: 0, fontFamily: "Arial, sans-serif" }}>
          <Container style={{ maxWidth: 560, margin: "32px auto" }}>
            <Section style={{ background: "#0B1F3A", padding: "28px 32px", borderRadius: "12px 12px 0 0" }}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                Referral payout
              </Text>
              <Heading as="h1" style={{ color: "#00B8A9", fontSize: 32, margin: "8px 0 0 0", letterSpacing: "-0.02em" }}>
                {amount}
              </Heading>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "4px 0 0" }}>
                for {period}
              </Text>
            </Section>

            <Section style={{ background: "white", padding: "28px 32px" }}>
              <Text style={{ fontSize: 14, color: "#374357", margin: "0 0 8px" }}>
                Hi {partnerName ?? "there"},
              </Text>
              <Text style={{ fontSize: 14, color: "#374357", lineHeight: 1.7, margin: 0 }}>
                Your share of {entryCount ?? 0} commission{entryCount === 1 ? "" : "s"}{" "}
                from {period} has been moved to <strong>paid</strong>. The funds
                will land in your nominated bank within 3 business days.
              </Text>

              <Hr style={{ borderColor: "#E2E6ED", margin: "20px 0" }} />

              <Text style={{ fontSize: 13, color: "#6B7A92", margin: 0, lineHeight: 1.6 }}>
                You&apos;ve earned this by referring clients who placed orders
                through nexxtt.io. You&apos;ll keep earning 20% on their orders
                for 12 months from their first purchase.
              </Text>

              <Section style={{ textAlign: "center", margin: "24px 0 4px" }}>
                <Link
                  href={link}
                  style={{
                    background: "#00B8A9",
                    color: "#0B1F3A",
                    fontSize: 14,
                    fontWeight: 800,
                    padding: "12px 24px",
                    borderRadius: 10,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  View your referral dashboard →
                </Link>
              </Section>
            </Section>

            <Section style={{ background: "#f7f8fa", padding: "16px 32px", borderRadius: "0 0 12px 12px", borderTop: "1px solid #E2E6ED" }}>
              <Text style={{ fontSize: 11, color: "#6B7A92", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Sent by nexxtt.io · Payout questions?
                Reply to this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
