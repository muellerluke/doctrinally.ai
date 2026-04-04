import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@doctrinally.ai";
const TO_EMAIL = "muellerluke24@gmail.com";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, message } = body as {
    name?: string;
    email?: string;
    message?: string;
  };

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required" },
      { status: 400 }
    );
  }

  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long" },
      { status: 400 }
    );
  }

  try {
    const { error } = await resend.emails.send({
      from: `Doctrinally.AI Contact <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Contact form: ${name}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #2C1810; margin-bottom: 24px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #8b7355; font-size: 13px; vertical-align: top; width: 80px;">Name</td>
              <td style="padding: 8px 0; color: #2C1810; font-size: 14px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8b7355; font-size: 13px; vertical-align: top;">Email</td>
              <td style="padding: 8px 0; color: #2C1810; font-size: 14px;">
                <a href="mailto:${email}" style="color: #4A2C2A;">${email}</a>
              </td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 20px 0;" />
          <div style="color: #2C1810; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message}</div>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 24px 0;" />
          <p style="color: #a89880; font-size: 11px;">
            Sent from the Doctrinally.AI contact form
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Contact email error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
