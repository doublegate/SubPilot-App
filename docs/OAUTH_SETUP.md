# OAuth Provider Setup Guide

This guide walks through setting up production OAuth applications for Google and GitHub authentication.

## 🟦 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project details:
   - **Project name**: `SubPilot Production`
   - **Organization**: Your organization (if applicable)
4. Click "Create"

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google+ API** (for user profile information)
   - **People API** (for additional user data)

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you have Google Workspace)
3. Fill in the required information:

```
Application name: SubPilot
User support email: support@subpilot.com
Developer contact information: dev@subpilot.com

Application homepage: https://subpilot.com
Application privacy policy: https://subpilot.com/privacy
Application terms of service: https://subpilot.com/terms
```

4. **Scopes**: Add the following scopes:
   - `openid`
   - `email`
   - `profile`

5. **Test users**: Add test email addresses for development

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure the application:

```
Name: SubPilot Production

Authorized JavaScript origins:
- https://subpilot.com
- https://www.subpilot.com

Authorized redirect URIs:
- https://subpilot.com/api/auth/callback/google
- https://www.subpilot.com/api/auth/callback/google
```

5. Click "Create"
6. **Save the credentials**:
   - Client ID: `your-client-id.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-your-client-secret`

### Step 5: Domain Verification (Optional but Recommended)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add and verify your domain: `subpilot.com`
3. Add the verified domain to your OAuth consent screen

## 🐙 GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:

```
Application name: SubPilot
Homepage URL: https://subpilot.com
Application description: Your command center for recurring finances
Authorization callback URL: https://subpilot.com/api/auth/callback/github
```

4. Click "Register application"

### Step 2: Configure Application Settings

1. **Upload application logo**:
   - Use your SubPilot logo (PNG, 1024x1024px recommended)
   
2. **Application URL**: `https://subpilot.com`

3. **Callback URL**: `https://subpilot.com/api/auth/callback/github`

### Step 3: Generate Client Secret

1. In your OAuth app settings, click "Generate a new client secret"
2. **Save the credentials**:
   - Client ID: `your-github-client-id`
   - Client Secret: `your-github-client-secret`

### Step 4: Additional Configuration (Optional)

1. **Webhook URL**: `https://subpilot.com/api/webhooks/github` (if needed)
2. **User authorization callback URL**: Same as above
3. **Request user authorization**: Enable if you need additional permissions

## 🔒 Security Best Practices

### Environment Variables

Add these to your production environment:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Redirect URI Security

✅ **Correct redirect URIs**:
- `https://subpilot.com/api/auth/callback/google`
- `https://subpilot.com/api/auth/callback/github`

❌ **Avoid these patterns**:
- `http://` URLs in production
- Wildcard domains (`*.subpilot.com`)
- Non-HTTPS URLs

### Secret Management

1. **Never commit secrets** to version control
2. **Use environment variables** in production
3. **Rotate secrets** regularly (quarterly recommended)
4. **Monitor usage** through provider dashboards

## 🧪 Testing OAuth Integration

### Manual Testing

1. **Test Google OAuth**:
   ```bash
   curl -X GET "https://subpilot.com/api/auth/signin/google"
   ```

2. **Test GitHub OAuth**:
   ```bash
   curl -X GET "https://subpilot.com/api/auth/signin/github"
   ```

### Automated Testing

Run the production integration test:

```bash
npm run test:production-integrations
```

## 🚨 Troubleshooting

### Common Issues

#### Google OAuth Errors

**Error**: `redirect_uri_mismatch`
- **Solution**: Verify redirect URIs exactly match in Google Console

**Error**: `invalid_client`
- **Solution**: Check client ID and secret are correct

**Error**: `access_denied`
- **Solution**: User cancelled or app not approved

#### GitHub OAuth Errors

**Error**: `incorrect_client_credentials`
- **Solution**: Verify client ID and secret

**Error**: `redirect_uri_mismatch`
- **Solution**: Check callback URL in GitHub app settings

**Error**: `application_suspended`
- **Solution**: Check GitHub app status and terms compliance

### Debug Mode

Enable OAuth debugging in development:

```bash
AUTH_DEBUG=true npm run dev
```

## 📋 Production Checklist

### Before Go-Live

- [ ] Google OAuth app created and configured
- [ ] GitHub OAuth app created and configured
- [ ] Domain verification completed (Google)
- [ ] Redirect URIs use HTTPS
- [ ] Client secrets stored securely
- [ ] OAuth consent screen approved (Google)
- [ ] Test authentication flows
- [ ] Monitor OAuth provider dashboards

### Post-Deployment

- [ ] Verify authentication works in production
- [ ] Monitor error rates in OAuth providers
- [ ] Set up alerts for authentication failures
- [ ] Document OAuth app details for team access

## 📞 Support Contacts

### Provider Support

- **Google OAuth**: [Google Cloud Support](https://cloud.google.com/support)
- **GitHub OAuth**: [GitHub Support](https://support.github.com/)

### Internal Documentation

- OAuth provider credentials: [Team password manager]
- Emergency OAuth contacts: [Team contact list]
- OAuth monitoring dashboards: [Link to monitoring]

---

**Note**: Keep this documentation updated when making changes to OAuth configurations. All team members with production access should review this guide.