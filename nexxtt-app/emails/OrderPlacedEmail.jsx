import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Tailwind, Text,
} from "@react-email/components";

/**
 * Sent to the agency owner when they place a new order AND to the client
 * (if their portal is active) as a "new work underway" notice.
 *
 * Props:
 *   recipientName, jobNumber
 *   services: [{ name, icon, retail_cents }]
 *   totalRetailCents, totalProfitCents
 *   link, viewer: "agency" | "agency_client" | "direct_client"
 *   brandName, brandPrimaryColour — white-label display. When viewer is
 *     "agency_client", the email must show the agency's brand, never nexxtt.io.
 */
export function OrderPlacedEmail({
  recipientName, jobNumber, services, totalRetailCents, totalProfitCents, link,
  viewer = "agency",
  brandName, brandPrimaryColour,
}) {
  const showProfit = viewer === "agency";
  // White-label: agency_client emails show their agency brand, never nexxtt.io.
  const headerBrand = viewer === "agency_client"
    ? (brandName ?? "Your agency")
    : "nexxtt.io";
  const footerBrand = viewer === "agency_client"
    ? (brandName ?? "your agency")
    : "nexxtt.io";
  const headerBg = brandPrimaryColour ?? "#0B1F3A";
  const headerTitle =
    viewer === "agency_client"
      ? "New work is underway"
      : viewer === "direct_client"
      ? "Your order is confirmed"
      : `Order ${jobNumber} placed`;
  const introCopy =
    viewer === "agency_client"
      ? "Your agency just started new work on your behalf. You'll see live status updates in your portal as each project progresses."
      : viewer === "direct_client"
      ? "Thanks for your order — our design team has everything they need and will start work right away."
      : "The team has been notified and will pick up each project as soon as the brief is confirmed.";

  return (
    <Html>
      <Head />
      <Preview>{headerTitle}</Preview>
      <Tailwind>
        <Body style={{ background: "#f0f2f5", margin: 0, padding: 0, fontFamily: "Arial, sans-serif" }}>
          <Container style={{ maxWidth: 560, margin: "32px auto" }}>
            <Section style={{ background: headerBg, padding: "28px 32px", borderRadius: "12px 12px 0 0" }}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                {headerBrand}
              </Text>
              <Heading as="h1" style={{ color: "white", fontSize: 22, margin: "6px 0 0 0", letterSpacing: "-0.01em" }}>
                {headerTitle}
              </Heading>
            </Section>

            <Section style={{ background: "white", padding: "28px 32px" }}>
              <Text style={{ fontSize: 14, color: "#374357", margin: "0 0 8px" }}>
                Hi {recipientName ?? "there"},
              </Text>
              <Text style={{ fontSize: 14, color: "#374357", lineHeight: 1.7, margin: 0 }}>
                {introCopy}
              </Text>

              <Hr style={{ borderColor: "#E2E6ED", margin: "20px 0" }} />

              <Text style={{ fontSize: 11, color: "#6B7A92", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: "0 0 10px" }}>
                Order {jobNumber}
              </Text>
              {services.map((s, i) => (
                <Section
                  key={i}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < services.length - 1 ? "1px solid #E2E6ED" : "none",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#0B1F3A", fontWeight: 600, margin: 0 }}>
                    {s.icon} {s.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#374357", margin: "2px 0 0", textAlign: "right" }}>
                    ${((s.retail_cents ?? 0) / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </Text>
                </Section>
              ))}

              <Hr style={{ borderColor: "#E2E6ED", margin: "14px 0" }} />

              <table style={{ width: "100%", fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#6B7A92", padding: "4px 0" }}>Total {showProfit ? "billed to client" : ""}</td>
                    <td style={{ color: "#0B1F3A", fontWeight: 700, padding: "4px 0", textAlign: "right" }}>
                      ${((totalRetailCents ?? 0) / 100).toLocaleString("en-AU")}
                    </td>
                  </tr>
                  {showProfit && totalProfitCents != null && (
                    <tr>
                      <td style={{ color: "#10B981", padding: "4px 0", fontWeight: 600 }}>Your profit</td>
                      <td style={{ color: "#10B981", fontWeight: 700, padding: "4px 0", textAlign: "right" }}>
                        ${((totalProfitCents ?? 0) / 100).toLocaleString("en-AU")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

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
                  View order →
                </Link>
              </Section>
            </Section>

            <Section style={{ background: "#f7f8fa", padding: "16px 32px", borderRadius: "0 0 12px 12px", borderTop: "1px solid #E2E6ED" }}>
              <Text style={{ fontSize: 11, color: "#6B7A92", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                This is an automated confirmation from {footerBrand}.
                <br />
                Questions? Reply to this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
