import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Tailwind, Text,
} from "@react-email/components";

/**
 * White-label agency-client invite. `brand` drives the colours + display name
 * so the email feels like it came from the agency, not nexxtt.io.
 *
 * Props:
 *   brand: { display_name, primary_colour, accent_colour }
 *   contactName, contactEmail, subject, message, cta, signOff
 *   actionLink — magic link URL
 *   portalUrl  — pretty URL shown under the button
 */
export function ClientInviteEmail({
  brand, contactName, subject, message, cta, signOff, actionLink, portalUrl,
}) {
  const primary = brand?.primary_colour ?? "#0B1F3A";
  const accent  = brand?.accent_colour  ?? "#00B8A9";
  const displayName = brand?.display_name ?? "Your agency";

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind>
        <Body style={{ background: "#f0f2f5", margin: 0, padding: 0, fontFamily: "Arial, sans-serif" }}>
          <Container style={{ maxWidth: 560, margin: "32px auto", padding: 0 }}>
            <Section style={{ background: primary, padding: "28px 32px", borderRadius: "12px 12px 0 0" }}>
              <Heading as="h1" style={{ color: "white", fontSize: 22, margin: 0, letterSpacing: "-0.01em" }}>
                {displayName}
              </Heading>
              <div style={{ height: 2, width: 32, background: accent, marginTop: 8, borderRadius: 2 }} />
            </Section>

            <Section style={{ background: "white", padding: "28px 32px" }}>
              <Heading as="h2" style={{ color: primary, fontSize: 18, margin: "0 0 16px 0" }}>
                {subject}
              </Heading>
              <Text style={{ fontSize: 14, color: "#374357", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
                {message}
              </Text>

              <Section style={{ textAlign: "center", margin: "28px 0" }}>
                <Link
                  href={actionLink ?? portalUrl}
                  style={{
                    background: primary,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 800,
                    padding: "14px 28px",
                    borderRadius: 10,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {cta ?? "Set up my portal →"}
                </Link>
              </Section>

              <Text style={{ fontSize: 12, color: "#6B7A92", textAlign: "center", margin: "4px 0" }}>
                Or copy this link:
              </Text>
              <Section
                style={{
                  background: `${accent}14`,
                  padding: "8px 12px",
                  borderRadius: 6,
                  textAlign: "center",
                  margin: "4px 0 20px",
                }}
              >
                <Text style={{ fontSize: 12, color: accent, margin: 0, wordBreak: "break-all" }}>
                  {portalUrl}
                </Text>
              </Section>

              <Hr style={{ borderColor: "#E2E6ED", margin: "16px 0" }} />
              <Text style={{ fontSize: 13, color: "#374357", lineHeight: 1.7, margin: 0 }}>
                Warm regards,
                <br />
                <strong>{signOff ?? displayName}</strong>
              </Text>
            </Section>

            <Section style={{ background: "#f7f8fa", padding: "16px 32px", borderRadius: "0 0 12px 12px", borderTop: "1px solid #E2E6ED" }}>
              <Text style={{ fontSize: 11, color: "#6B7A92", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                This invitation was sent by {displayName}.<br />
                Questions? Reply to this email.<br />
                This link expires in 7 days.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
