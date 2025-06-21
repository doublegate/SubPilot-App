import nodemailer from "nodemailer"
import { env } from "@/env.js"

type SendVerificationRequestParams = {
  identifier: string
  url: string
  expires: Date
  provider: {
    server?: unknown
    from?: string
  }
  token: string
  theme: unknown
  request: Request
}

// Create transporter based on environment
const createTransporter = () => {
  if (env.NODE_ENV === "development") {
    // Use Mailhog for development
    return nodemailer.createTransport({
      host: env.SMTP_HOST ?? "localhost",
      port: parseInt(env.SMTP_PORT ?? "1025"),
      secure: false,
      ignoreTLS: true,
    })
  } else {
    // Use SendGrid for production
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: env.SENDGRID_API_KEY ?? "",
      },
    })
  }
}

export async function sendVerificationRequest(params: SendVerificationRequestParams) {
  const { identifier: email, url } = params
  const { host } = new URL(url)
  const transporter = createTransporter()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to SubPilot</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); max-width: 600px;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #06B6D4, #9333EA); border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Sign in to SubPilot</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                      Hello! 👋
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                      Click the button below to sign in to your SubPilot account. This magic link will expire in 24 hours and can only be used once.
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${url}" 
                             style="background: linear-gradient(135deg, #06B6D4, #9333EA); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                            Sign in to SubPilot
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 30px 0 0;">
                      Or copy and paste this URL into your browser:
                    </p>
                    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 10px 0 0; word-break: break-all;">
                      ${url}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 0 0 10px; text-align: center;">
                      If you didn't request this email, you can safely ignore it.
                    </p>
                    <p style="color: #9CA3AF; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} SubPilot. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `Sign in to SubPilot

Click this link to sign in:
${url}

This link expires in 24 hours and can only be used once.

If you didn't request this email, you can safely ignore it.

© ${new Date().getFullYear()} SubPilot. All rights reserved.`

  try {
    await transporter.sendMail({
      from: env.FROM_EMAIL ?? '"SubPilot" <noreply@subpilot.com>',
      to: email,
      subject: `Sign in to ${host}`,
      text,
      html,
    })
  } catch (error) {
    console.error("Failed to send verification email:", error)
    throw new Error("Failed to send verification email")
  }
}

// Helper function to send general emails
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const transporter = createTransporter()
  
  await transporter.sendMail({
    from: env.FROM_EMAIL ?? '"SubPilot" <noreply@subpilot.com>',
    to,
    subject,
    html,
    text,
  })
}