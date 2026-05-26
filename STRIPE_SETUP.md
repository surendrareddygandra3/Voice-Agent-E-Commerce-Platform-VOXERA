# Stripe Checkout Integration Setup Guide

## Overview
The app now uses **Stripe Checkout** with **Supabase Edge Functions** for secure, server-side order creation and payment processing. This eliminates RLS issues and keeps payment logic secure.

## Architecture
1. **User clicks "Confirm & Pay"** → Client calls `/create-checkout` Edge Function
2. **Edge Function (server-side)** → Creates pending order + order items in DB (using service role, no RLS)
3. **Stripe Session Created** → Returns checkout URL
4. **User redirected to Stripe Checkout** → Fills payment details on Stripe-hosted page
5. **Payment Success** → Stripe calls webhook `/stripe-webhook` Edge Function
6. **Webhook (server-side)** → Marks order as paid, clears user cart
7. **User redirected to Orders page** → Shows successful order

## Setup Steps

### 1. Get Stripe API Keys
1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in
3. Go to **Developers** → **API Keys**
4. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
5. You'll also need the **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### 2. Set Up Environment Variables

Create or update `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://mtgtycfctyodoscxxbqc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Z3R5Y2ZjdHlvZG9zY3h4YnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTgwNjgsImV4cCI6MjA3ODc3NDA2OH0.fZ53sOLQTGPH2n2xGTWu7SB9uJ1IAvuwE9VAB_0lvPA
```

The Stripe keys will be set in **Supabase Edge Function secrets** (see step 4).

### 3. Deploy Edge Functions to Supabase

1. **Install Supabase CLI** (if not already installed):
   ```powershell
   npm install -g supabase
   ```

2. **Log in to Supabase**:
   ```powershell
   supabase login
   ```

3. **Link your project**:
   ```powershell
   supabase link --project-ref mtgtycfctyodoscxxbqc
   ```

4. **Deploy the Edge Functions**:
   ```powershell
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook
   ```

### 4. Add Stripe Secrets to Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com) → Your Project
2. Go to **Functions** in the left sidebar
3. Click **create-checkout** → **Secrets**
4. Add these secrets:
   - `STRIPE_SECRET_KEY`: Your Stripe Secret Key (from step 1)
   - `STRIPE_WEBHOOK_SECRET`: Get this from **Stripe Dashboard** → **Webhooks** (see step 5)

5. Repeat for `stripe-webhook` function

### 5. Configure Stripe Webhook

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://<your-project-id>.supabase.co/functions/v1/stripe-webhook`
   - Replace `<your-project-id>` with `mtgtycfctyodoscxxbqc`
   - Full URL: `https://mtgtycfctyodoscxxbqc.supabase.co/functions/v1/stripe-webhook`
4. **Events to send**:
   - Select: `checkout.session.completed`
5. Click **Create endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add this as `STRIPE_WEBHOOK_SECRET` in Supabase function secrets (see step 4)

### 6. Test Locally (Development)

**For local testing without deploying**, you can use Stripe CLI to forward webhooks:

1. **Install Stripe CLI** from [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. **Log in to Stripe CLI**:
   ```powershell
   stripe login
   ```

3. **Forward webhooks locally**:
   ```powershell
   stripe listen --forward-to localhost:8081/stripe-webhook
   ```

4. Copy the webhook secret it shows and use it in your `.env.local` for testing

**For Edge Function testing** (recommended):
- Deploy to Supabase (step 3 & 4) then test with the live URL

### 7. Test the Checkout Flow

1. **Start the dev server**:
   ```powershell
   npm run dev
   ```

2. **Go to your app**: http://localhost:8081

3. **Add items to cart** (or use voice: "Add wireless headphones to cart")

4. **Go to cart** and click **Confirm & Pay**

5. **Fill payment details** (use [Stripe test cards](https://stripe.com/docs/testing)):
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)

6. **Complete payment** → You should be redirected to **Orders page** with your new order showing

### 8. Test Card Numbers (Stripe Test Mode)

- **Successful payment**: `4242 4242 4242 4242`
- **Declined card**: `4000 0000 0000 0002`
- **3D Secure required**: `4000 0025 0000 3155`

[More test cards](https://stripe.com/docs/testing#cards)

## Troubleshooting

### "Failed to create checkout session"
- Check Supabase function logs: **Supabase Dashboard** → **Functions** → **create-checkout** → **Logs**
- Ensure `STRIPE_SECRET_KEY` is set in Edge Function secrets

### "Webhook not received after payment"
- Check Stripe webhook logs: **Stripe Dashboard** → **Webhooks** → Click your endpoint → Check **Recent attempts**
- Ensure webhook URL is correct and `STRIPE_WEBHOOK_SECRET` is set correctly

### "Order not showing after payment"
- Check Supabase function logs for `stripe-webhook`
- Verify order was created with `status = 'paid'` in Supabase SQL Editor:
  ```sql
  SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
  ```

### Orders are "pending" instead of "paid"
- Webhook might not have fired successfully
- Check webhook logs in Stripe Dashboard
- Manually test webhook with: **Send test event** → `checkout.session.completed`

## Security Notes

- ✅ **Service role key** used only on server-side (Edge Functions)
- ✅ **RLS policies** protect data (no client-side DB inserts for orders)
- ✅ **Webhook signed** with Stripe signature verification
- ✅ **Card details** handled by Stripe (PCI compliant)
- ❌ **Never expose** `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in browser code

## File Changes

- ✨ **Created**: `supabase/functions/create-checkout/index.ts` — Checkout session creation
- ✨ **Created**: `supabase/functions/stripe-webhook/index.ts` — Payment webhook handler
- 📝 **Updated**: `src/pages/Cart.tsx` — Calls Stripe checkout instead of direct DB inserts
- 📦 **Added**: `stripe` package to `package.json`

## Next Steps (Optional)

- Add email notifications on order success
- Track payment status in Orders page UI
- Add refund logic
- Switch to live keys when ready to accept real payments

---

**Questions?** Check Stripe docs: [https://stripe.com/docs](https://stripe.com/docs)
