import sanitizeHtml from 'sanitize-html';

export interface BaseEmailTemplateProps {
  preheader?: string;
  content: string;
}

export function baseEmailTemplate({
  preheader,
  content,
}: BaseEmailTemplateProps): {
  html: string;
  text: string;
} {
  const currentYear = new Date().getFullYear();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>SubPilot Notification</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }
          
          @media (prefers-color-scheme: dark) {
            .email-body {
              background-color: #1f2937 !important;
            }
            .email-container {
              background-color: #111827 !important;
              color: #f3f4f6 !important;
            }
            .email-header {
              background: linear-gradient(135deg, #0891b2, #7c3aed) !important;
            }
            .email-footer {
              background-color: #1f2937 !important;
              border-color: #374151 !important;
            }
            .text-muted {
              color: #9ca3af !important;
            }
            .btn-primary {
              background: linear-gradient(135deg, #0891b2, #7c3aed) !important;
            }
          }
        </style>
      </head>
      <body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>` : ''}
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table class="email-container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td class="email-header" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #06B6D4, #9333EA); border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">SubPilot</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px;">Your command center for recurring finances</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td class="email-content" style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="email-footer" style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; text-align: center;">
                    <p class="text-muted" style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 0 0 10px;">
                      You received this email because you have an account with SubPilot.
                    </p>
                    <p class="text-muted" style="color: #6B7280; font-size: 14px; line-height: 20px; margin: 0 0 10px;">
                      <a href="https://subpilot.com/settings/notifications" style="color: #7c3aed; text-decoration: none;">Manage email preferences</a> | 
                      <a href="https://subpilot.com/help" style="color: #7c3aed; text-decoration: none;">Get help</a>
                    </p>
                    <p class="text-muted" style="color: #9CA3AF; font-size: 12px; line-height: 18px; margin: 0;">
                      © ${currentYear} SubPilot. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // Extract text content from HTML by removing tags safely
  const text =
    sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {},
      textFilter: (text) => text.replace(/\s+/g, ' ').trim()
    }) +
    `\n\n© ${currentYear} SubPilot. All rights reserved.`;

  return { html, text };
}
