import { Resend } from "resend";
import { render } from "@react-email/render";

/**
 * sendEmail({ to, subject, react, from? })
 *
 * Behaviour:
 *  - If RESEND_API_KEY is unset: logs + returns { sent: false, reason: 'no-key' }.
 *    Call sites should treat email as best-effort — never block a mutation on it.
 *  - If set: renders the React Email component via @react-email/render, posts to
 *    Resend, and returns the Resend response id on success.
 *
 * `from` defaults to a generic nexxtt.io sender — override per-call to use
 * a white-label sender (e.g. `Bright Agency Co. <noreply@nexxtt.io>`).
 */
const DEFAULT_FROM = "nexxtt.io <noreply@nexxtt.io>";

export async function sendEmail({ to, subject, react, from = DEFAULT_FROM, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // No-op path — common in dev until the key is added. We still render the HTML
    // once so rendering errors surface loudly in dev logs.
    try {
      await render(react);
    } catch (err) {
      console.error("[email] failed to render:", err);
      return { sent: false, reason: "render-error", error: err?.message };
    }
    console.log(`[email] RESEND_API_KEY not set — not sending: "${subject}" → ${to}`);
    return { sent: false, reason: "no-key" };
  }

  const resend = new Resend(apiKey);
  try {
    const html = await render(react);
    const res = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
    if (res.error) {
      console.error("[email] Resend error:", res.error);
      return { sent: false, reason: "resend-error", error: res.error.message };
    }
    return { sent: true, id: res.data?.id };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false, reason: "exception", error: err?.message };
  }
}
