# SendGrid Production Setup Guide

This guide walks through setting up SendGrid for production email delivery, including domain authentication, email templates, and monitoring.

## 📧 SendGrid Account Setup

### Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for an account
3. Choose appropriate pricing tier:
   - **Free**: 100 emails/day (good for testing)
   - **Essentials**: $19.95/month (40,000 emails)
   - **Pro**: $89.95/month (100,000 emails)

### Step 2: Complete Account Verification

1. Verify your email address
2. Complete account verification process
3. Add company information if required

## 🌐 Domain Authentication

### Step 1: Authenticate Your Domain

1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Choose "Yes" for branded links
4. Enter your domain: `subpilot.com`
5. SendGrid will provide DNS records

### Step 2: Add DNS Records

Add these DNS records to your domain provider (example values):

```dns
# CNAME Records for Domain Authentication
Record Type: CNAME
Host: s1._domainkey.subpilot.com
Value: s1.domainkey.u12345.wl123.sendgrid.net

Record Type: CNAME
Host: s2._domainkey.subpilot.com
Value: s2.domainkey.u12345.wl123.sendgrid.net

# CNAME for Link Branding
Record Type: CNAME
Host: 12345.subpilot.com
Value: sendgrid.net

# TXT Record for SPF
Record Type: TXT
Host: subpilot.com
Value: v=spf1 include:sendgrid.net ~all
```

### Step 3: Verify Domain Authentication

1. Wait for DNS propagation (up to 48 hours)
2. Click "Verify" in SendGrid dashboard
3. Ensure all records show as verified

## 🔑 API Key Setup

### Step 1: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Full Access" for production
4. Name: `SubPilot Production`
5. **Save the API key securely** - you won't see it again

### Step 2: Store API Key

Add to your production environment:

```bash
SENDGRID_API_KEY="SG.your-sendgrid-api-key-here"
FROM_EMAIL="noreply@subpilot.com"
SUPPORT_EMAIL="support@subpilot.com"
```

## 📄 Email Templates

### Step 1: Create Dynamic Templates

1. Go to Email API → Dynamic Templates
2. Create the following templates:

#### Welcome Email Template

**Template Name**: `SubPilot Welcome`
**Subject**: `Welcome to SubPilot, {{user_name}}! 🎉`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome to SubPilot</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #06B6D4; font-size: 24px; font-weight: bold; margin: 0;">SubPilot</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-top: 0;">Welcome to SubPilot, {{user_name}}! 🎉</h1>
            
            <p style="color: #4b5563; line-height: 1.6;">We're excited to help you take control of your recurring subscriptions and save money.</p>
            
            <p style="color: #4b5563; line-height: 1.6;">Get started by:</p>
            <ul style="color: #4b5563; line-height: 1.6;">
                <li>Connecting your first bank account</li>
                <li>Reviewing detected subscriptions</li>
                <li>Setting up cancellation alerts</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{login_url}}" style="display: inline-block; padding: 12px 24px; background: #06B6D4; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Get Started</a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
                <a href="https://subpilot.com" style="color: #06B6D4;">subpilot.com</a> | 
                <a href="https://subpilot.com/support" style="color: #06B6D4;">Support</a> | 
                <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
```

#### Magic Link Template

**Template Name**: `SubPilot Magic Link`
**Subject**: `Sign in to SubPilot`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign in to SubPilot</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #06B6D4; font-size: 24px; font-weight: bold; margin: 0;">SubPilot</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-top: 0;">Sign in to SubPilot</h1>
            
            <p style="color: #4b5563; line-height: 1.6;">Hi {{user_name}},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">Click the link below to sign in to your SubPilot account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{magic_link}}" style="display: inline-block; padding: 12px 24px; background: #06B6D4; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Sign In to SubPilot</a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>Security note:</strong> This link expires at {{expires_at}}. If you didn't request this sign-in link, you can safely ignore this email.</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="color: #6b7280; font-size: 14px; word-break: break-all;">{{magic_link}}</p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
                <a href="https://subpilot.com" style="color: #06B6D4;">subpilot.com</a> | 
                <a href="https://subpilot.com/support" style="color: #06B6D4;">Support</a>
            </p>
        </div>
    </div>
</body>
</html>
```

#### Subscription Alert Template

**Template Name**: `SubPilot Subscription Alert`
**Subject**: `New subscription detected: {{subscription_name}}`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>New Subscription Detected</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #06B6D4; font-size: 24px; font-weight: bold; margin: 0;">SubPilot</h1>
        </div>
        
        <!-- Alert Banner -->
        <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; color: #92400e;">🚨 New Subscription Detected</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="color: #4b5563; line-height: 1.6;">Hi {{user_name}},</p>
            
            <p style="color: #4b5563; line-height: 1.6;">We've detected a new recurring subscription on your connected accounts:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">{{subscription_name}}</h3>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Amount:</strong> {{amount}}</p>
                <p style="margin: 5px 0 0 0; color: #4b5563;"><strong>Next billing:</strong> {{next_billing}}</p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">If this subscription is unexpected or unwanted, you can take action:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{cancel_url}}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">Help Me Cancel</a>
                <a href="https://subpilot.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #06B6D4; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">View Dashboard</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;"><em>This alert was sent because you have subscription monitoring enabled. You can adjust your notification preferences in your dashboard.</em></p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px;">
            <p>Best regards,<br>The SubPilot Team</p>
            <p>
                <a href="https://subpilot.com/dashboard" style="color: #06B6D4;">Dashboard</a> | 
                <a href="https://subpilot.com/settings" style="color: #06B6D4;">Settings</a> | 
                <a href="https://subpilot.com/support" style="color: #06B6D4;">Support</a>
            </p>
        </div>
    </div>
</body>
</html>
```

### Step 2: Get Template IDs

After creating each template:
1. Note the Template ID (format: `d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
2. Update `src/lib/email-templates/production.ts`:

```typescript
export const SENDGRID_TEMPLATES = {
  WELCOME: {
    id: 'd-your-welcome-template-id',
    // ...
  },
  MAGIC_LINK: {
    id: 'd-your-magic-link-template-id',
    // ...
  },
  SUBSCRIPTION_ALERT: {
    id: 'd-your-subscription-alert-template-id',
    // ...
  },
};
```

## 📊 Monitoring & Analytics

### Step 1: Enable Tracking

1. Go to Settings → Tracking
2. Enable:
   - Click Tracking
   - Open Tracking
   - Google Analytics (optional)

### Step 2: Set Up Webhooks (Optional)

1. Go to Settings → Mail Settings → Event Webhook
2. HTTP Post URL: `https://subpilot.com/api/webhooks/sendgrid`
3. Select events to track:
   - Delivered
   - Opened
   - Clicked
   - Bounced
   - Spam Report

### Step 3: Monitor Email Reputation

1. Monitor sender reputation in SendGrid dashboard
2. Watch for:
   - Bounce rate < 5%
   - Spam complaint rate < 0.1%
   - High delivery rate > 95%

## 🧪 Testing Email Delivery

### Test in Development

```bash
# Run the test script
npm run test:email-integration

# Or test directly with curl
curl -X POST "https://subpilot.com/api/test/email" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test in Production

1. **Welcome Email Test**:
   - Create a new account
   - Verify welcome email is received

2. **Magic Link Test**:
   - Try passwordless login
   - Check email delivery time

3. **Subscription Alert Test**:
   - Trigger a subscription detection
   - Verify alert email is sent

## 🚨 Troubleshooting

### Common Issues

#### Email Not Delivered

1. **Check sender reputation** in SendGrid dashboard
2. **Verify domain authentication** is complete
3. **Check recipient's spam folder**
4. **Review activity logs** in SendGrid

#### Template Not Working

1. **Verify template ID** is correct in code
2. **Check template variables** match code
3. **Test template** in SendGrid dashboard
4. **Review error logs** in application

#### High Bounce Rate

1. **Clean email list** - remove invalid addresses
2. **Use double opt-in** for new subscribers
3. **Monitor blacklists** and sender reputation
4. **Implement email validation** before sending

## 📋 Production Checklist

### Pre-Launch

- [ ] SendGrid account created and verified
- [ ] Domain authentication completed and verified
- [ ] API key created with appropriate permissions
- [ ] All email templates created and tested
- [ ] Template IDs updated in code
- [ ] DNS records properly configured
- [ ] Email delivery tested
- [ ] Monitoring and tracking enabled

### Post-Launch

- [ ] Monitor email delivery rates
- [ ] Check sender reputation regularly
- [ ] Review bounce and complaint rates
- [ ] Monitor template performance
- [ ] Set up alerts for delivery issues

## 📞 Support

### SendGrid Support

- **Documentation**: [SendGrid Docs](https://docs.sendgrid.com/)
- **Support Portal**: [SendGrid Support](https://support.sendgrid.com/)
- **Status Page**: [SendGrid Status](https://status.sendgrid.com/)

### Emergency Contacts

- SendGrid account owner: [Contact details]
- DNS provider access: [Contact details]
- Domain registrar: [Contact details]

---

**Note**: Keep API keys secure and rotate them regularly. Monitor email delivery metrics to maintain good sender reputation.