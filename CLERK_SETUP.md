# Clerk Authentication Setup Guide

This OptimEarn project has been refactored to use **Clerk** for authentication instead of Manus OAuth. This guide will help you set up Clerk and deploy the application to Vercel.

## Prerequisites

- A Clerk account (sign up at https://clerk.com)
- A Vercel account (sign up at https://vercel.com)
- Your OptimEarn project deployed or ready to deploy

## Step 1: Create a Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **Create Application**
3. Choose your authentication methods (Email, Google, GitHub, etc.)
4. Name your application (e.g., "OptimEarn")
5. Click **Create Application**

## Step 2: Get Your Clerk API Keys

In the Clerk Dashboard, navigate to **API Keys** and copy:

- **Publishable Key** (starts with `pk_test_` or `pk_live_`)
- **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Step 3: Set Up Clerk Webhook

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Create Endpoint**
3. Set the **Endpoint URL** to: `https://your-vercel-domain.com/api/webhooks/clerk`
4. Select the events you want to subscribe to:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the **Webhook Secret** (starts with `whsec_`)

## Step 4: Configure Vercel Environment Variables

In your Vercel project settings, add the following environment variables:

```
CLERK_SECRET_KEY=sk_test_your_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Also ensure these variables are set (from your previous setup):

```
DATABASE_URL=mysql://user:password@host/database
JWT_SECRET=your-super-secret-jwt-key
```

## Step 5: Deploy to Vercel

1. **Option A: Using Vercel CLI**
   ```bash
   vercel
   ```

2. **Option B: Using Git Integration**
   - Push your code to GitHub/GitLab/Bitbucket
   - Connect your repository to Vercel
   - Vercel will automatically deploy on every push

## Step 6: Configure Clerk Redirect URLs

After deploying to Vercel, update your Clerk application settings:

1. Go to **Settings** → **URLs**
2. Set **Allowed redirect URLs** to:
   - `https://your-vercel-domain.com/auth/sign-in`
   - `https://your-vercel-domain.com/auth/sign-up`
   - `https://your-vercel-domain.com/dashboard`
   - `https://your-vercel-domain.com`

3. Set **Allowed web origins** to:
   - `https://your-vercel-domain.com`

## Step 7: Test the Authentication Flow

1. Visit your deployed application
2. Click the login button on the home page
3. You should be redirected to Clerk's sign-in page
4. Sign in with your configured authentication method
5. You should be redirected back to the dashboard

## How It Works

### Frontend
- Users sign in via Clerk's hosted UI at `/auth/sign-in`
- After successful authentication, users are redirected to `/dashboard`
- The `useAuth()` hook manages the user session

### Backend
- Clerk JWT tokens are verified on every API request
- Users are automatically synced to your database on first sign-in
- The webhook handler keeps user data in sync with Clerk

### Database
- User data is stored in your MySQL database
- Clerk user IDs are stored as `openId` in the `users` table
- All existing features (points, rewards, tracking) work as before

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_test_xxx` |
| `CLERK_WEBHOOK_SECRET` | Webhook signature secret | `whsec_xxx` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend public key | `pk_test_xxx` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `NODE_ENV` | Environment | `production` |

## Troubleshooting

### "Invalid publishable key" error
- Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set in Vercel environment variables
- Verify the key starts with `pk_test_` or `pk_live_`

### Users not syncing to database
- Check that `CLERK_WEBHOOK_SECRET` is correctly set
- Verify the webhook endpoint URL is correct in Clerk Dashboard
- Check Vercel logs for webhook errors

### "User is banned" error
- Users can be banned through the admin panel
- Check the `isBanned` field in the `users` table

### Sign-in redirects to sign-up
- Ensure Clerk redirect URLs are properly configured
- Clear browser cookies and try again

## Migration from Manus OAuth

If you were previously using Manus OAuth:

1. **Old OAuth callback** (`/api/oauth/callback`) has been removed
2. **New Clerk pages** are at `/auth/sign-in` and `/auth/sign-up`
3. **User data** is preserved - existing users will be synced on first Clerk sign-in
4. **API endpoints** remain unchanged - all tracking and reward logic works as before

## Support

For Clerk support, visit: https://clerk.com/support

For OptimEarn issues, check the main README.md

## Next Steps

- Configure additional authentication methods in Clerk (Google, GitHub, etc.)
- Set up email verification in Clerk settings
- Enable multi-factor authentication (MFA) for enhanced security
- Monitor webhook deliveries in Clerk Dashboard
