# Stripe Test Keys Setup

How to get real Stripe test keys and wire them into the project.

---

## 1. Create a Stripe account

Go to https://dashboard.stripe.com/register and sign up (free).  
No credit card required for test mode.

---

## 2. Get test keys

1. Log in to the Stripe Dashboard
2. Make sure the toggle in the top-left says **Test mode** (not Live)
3. Go to **Developers → API keys**
4. Copy:
   - **Publishable key** — starts with `pk_test_`
   - **Secret key** — starts with `sk_test_` (click "Reveal")

---

## 3. Configure the API

Edit `apps/api/.env`:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

---

## 4. Configure the web frontend

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

---

## 5. Set up the webhook (local dev)

The backend's `POST /api/v1/payments/webhook` verifies Stripe's `Stripe-Signature` header using a **webhook signing secret**. In local dev, use the Stripe CLI to forward events.

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://github.com/stripe/stripe-cli/releases
```

### Login

```bash
stripe login
```

### Forward webhooks to local API

```bash
stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook
```

The CLI prints a **webhook signing secret** that starts with `whsec_`. Copy it.

### Add to API env

Edit `apps/api/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SIGNING_SECRET_HERE
```

Keep `stripe listen` running while testing payment flows.

---

## 6. Test payment

Use Stripe's test card numbers:

| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Payment declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

- Expiry: any future date (e.g. `12/34`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any 5 digits (e.g. `12345`)

---

## 7. Verify end-to-end

1. Start infrastructure: `docker compose up -d postgres redis maildev adminer`
2. Start API: `cd apps/api && npm run start:dev`
3. Run: `stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook`
4. Start web: `cd apps/web && npm run dev`
5. Register/login as a Customer
6. Browse to a published event → select tickets → click **Book tickets**
7. Enter test card `4242 4242 4242 4242` → click **Pay now**
8. Stripe CLI should log `payment_intent.succeeded` → check MailDev at http://localhost:1080 for the ticket email with QR attachment
9. Navigate to **My tickets** to see issued tickets and QR codes
