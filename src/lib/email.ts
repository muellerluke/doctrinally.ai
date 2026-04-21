import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@doctrinally.ai";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `Doctrinally.AI <${FROM_EMAIL}>`,
      to,
      subject: "Reset your password",
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #2C1810; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #5c4033; line-height: 1.6;">
            We received a request to reset your Doctrinally.AI password. Click the button below to choose a new password.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #4A2C2A; color: #F7F4F0; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #8b7355; font-size: 13px; line-height: 1.5;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 32px 0;" />
          <p style="color: #a89880; font-size: 12px;">
            Doctrinally.AI — AI-powered chat for churches
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export async function sendCaptionScanReportEmail(
  to: string,
  input: {
    churchName: string;
    channelTitle: string;
    total: number;
    withCaptions: number;
    withoutCaptions: number;
    missingSample: Array<{ documentId: string; title: string; url: string }>;
  }
): Promise<{ success: boolean; error?: string }> {
  const {
    churchName,
    channelTitle,
    total,
    withCaptions,
    withoutCaptions,
    missingSample,
  } = input;

  const coverage =
    total > 0 ? Math.round((withCaptions / total) * 100) : 0;

  const missingList = missingSample
    .map(
      (v) => `
        <li style="margin: 6px 0;">
          <a href="${v.url}" style="color: #4A2C2A; text-decoration: underline;">
            ${escapeHtml(v.title)}
          </a>
        </li>`
    )
    .join("");

  const helpUrl = "https://support.google.com/youtube/answer/2734796";

  try {
    const { error } = await resend.emails.send({
      from: `Doctrinally.AI <${FROM_EMAIL}>`,
      to,
      subject: `${withoutCaptions} ${churchName} videos need captions to be ingested`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #2C1810; margin-bottom: 8px;">Caption coverage report</h2>
          <p style="color: #5c4033; line-height: 1.6;">
            We scanned <strong>${escapeHtml(channelTitle)}</strong> and found
            <strong>${withCaptions} of ${total}</strong> videos (${coverage}%)
            with captions available. We can only ingest videos that have
            captions turned on, so <strong>${withoutCaptions}</strong> won&rsquo;t
            be added to ${escapeHtml(churchName)} until captions are enabled
            for them.
          </p>
          ${
            missingList
              ? `
          <div style="margin: 24px 0; padding: 16px 20px; background-color: #fdf6ef; border-radius: 8px;">
            <div style="color: #2C1810; font-weight: 600; margin-bottom: 8px;">
              Videos missing captions (showing first ${missingSample.length})
            </div>
            <ul style="color: #5c4033; padding-left: 20px; margin: 0;">
              ${missingList}
            </ul>
          </div>`
              : ""
          }
          <div style="margin: 32px 0; text-align: center;">
            <a href="${helpUrl}" style="background-color: #4A2C2A; color: #F7F4F0; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              How to enable captions
            </a>
          </div>
          <p style="color: #8b7355; font-size: 13px; line-height: 1.5;">
            Once captions are enabled, they&rsquo;ll be picked up on the next
            weekly sync &mdash; no need to re-upload anything.
          </p>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 32px 0;" />
          <p style="color: #a89880; font-size: 12px;">
            Doctrinally.AI &mdash; AI-powered chat for churches
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send caption scan report email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendInvitationEmail(
  to: string,
  churchName: string,
  role: string,
  inviteUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `Doctrinally.AI <${FROM_EMAIL}>`,
      to,
      subject: `You've been invited to ${churchName} on Doctrinally.AI`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #2C1810; margin-bottom: 16px;">You're invited!</h2>
          <p style="color: #5c4033; line-height: 1.6;">
            You've been invited to join <strong>${churchName}</strong> on Doctrinally.AI as ${role === "admin" ? "an admin" : `a ${role}`}.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${inviteUrl}" style="background-color: #4A2C2A; color: #F7F4F0; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #8b7355; font-size: 13px; line-height: 1.5;">
            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 32px 0;" />
          <p style="color: #a89880; font-size: 12px;">
            Doctrinally.AI — AI-powered chat for churches
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send invitation email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
