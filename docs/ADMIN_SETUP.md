# Admin Setup Guide

This guide explains how to set up the admin user and configure administrative access for SubPilot.

## Initial Admin Setup

### Method 1: Automatic Setup During Database Seeding

When you run the database seed command, an admin user is automatically created:

```bash
npm run db:seed
```

This will create:
- Admin user with email: `admin@subpilot.app` (or from `ADMIN_EMAIL` env var)
- Default password: `admin123456` (or from `ADMIN_PASSWORD` env var)
- Test user for development

### Method 2: Dedicated Admin Initialization Script

For production environments or to create an admin user separately:

```bash
npm run init:admin
```

This interactive script will:
1. Prompt for admin password if not set in environment
2. Create admin user with proper permissions
3. Add admin notification
4. Log the action in audit trail
5. Update `.env.local` with admin email

### Method 3: Environment Variables

Set these before running seed or init scripts:

```bash
# .env.local
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME="Admin Name"
```

## Database Schema

The admin functionality is built into the User model:

```prisma
model User {
  // ... other fields
  isAdmin Boolean @default(false)
  // ... relations
}
```

## Accessing the Admin Panel

1. Log in with your admin credentials
2. Click on your profile menu in the top right
3. Select "Admin Panel" (only visible to admin users)
4. Or navigate directly to `/admin`

## Admin Panel Features

### User Management
- View all users with search and filters
- Lock/unlock user accounts
- Create new users
- View user details and usage stats
- Upgrade users to admin status

### Billing Management
- Configure Stripe API keys
- Manage pricing plans
- View revenue statistics
- Monitor active subscriptions
- Handle billing events

### Plaid Configuration
- Set up Plaid API credentials
- Configure webhook endpoints
- Monitor connected bank accounts
- View popular institutions

### System Management
- View system health metrics
- Monitor recent events
- Check system alerts
- Access audit logs

## Security Considerations

1. **Strong Passwords**: Always use a strong, unique password for admin accounts
2. **Environment Security**: Never commit `.env.local` with admin credentials
3. **Access Control**: Admin access is checked at multiple levels:
   - Frontend navigation (hidden from non-admins)
   - Route protection (redirects non-admins)
   - API protection (admin procedures check permissions)
4. **Audit Trail**: All admin actions are logged

## Upgrading Existing Users to Admin

If you need to make an existing user an admin:

```bash
# Run the init:admin script - it will detect and upgrade existing users
npm run init:admin
```

Or use Prisma Studio:

```bash
npm run db:studio
# Navigate to User table
# Find the user and set isAdmin = true
```

## Troubleshooting

### Admin link not visible
1. Ensure the user has `isAdmin: true` in the database
2. Sign out and sign back in to refresh the session
3. Check that you've run the latest database migrations

### Access denied to admin panel
1. Verify `isAdmin` field is set to `true` for your user
2. Check the `ADMIN_EMAIL` environment variable matches your login
3. Clear browser cache and cookies
4. Check server logs for permission errors

### Database migration needed
If you get schema errors, run:

```bash
npm run db:push    # For development
npm run db:migrate # For production
```

## Production Deployment

1. Set secure environment variables:
   ```bash
   ADMIN_EMAIL=secure-admin@yourdomain.com
   ADMIN_PASSWORD=use-a-very-strong-password-here
   ```

2. Run the admin initialization:
   ```bash
   npm run init:admin
   ```

3. Consider additional security:
   - Enable 2FA when implemented
   - Use IP allowlisting for admin routes
   - Set up monitoring for admin actions
   - Regular security audits

## Complete Seed Process

To run all seed files in the correct order:

```bash
npm run db:seed
```

This single command automatically runs:
1. Main seed (admin + test user)
2. Pricing plans (imported and called)
3. Cancellation providers (imported and called)
4. Categories and merchant aliases (imported and called)

Individual seed commands are also available:
- `npm run db:seed:pricing` - Pricing plans only
- `npm run db:seed:cancellation` - Cancellation providers only  
- `npm run db:seed:categories` - Categories and merchant aliases only