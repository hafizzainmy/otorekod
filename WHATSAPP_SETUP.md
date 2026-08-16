# WhatsApp Cloud API Setup for OtoRekod

This guide walks you through connecting WhatsApp to OtoRekod so car owners can **send a receipt photo** and have it logged automatically.

---

## What you'll need

- A [Meta Developer](https://developers.facebook.com/) account (free)
- Your OtoRekod app deployed (e.g. on Vercel)
- Supabase **Service Role Key** (already used for shared passports)
- Gemini API key (already used for receipt scanning)

---

## Step 1: Create a Meta app

1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. Click **My Apps** → **Create App**.
3. Choose **Other** as the use case, then **Business** as the app type.
4. Name it **OtoRekod** and create the app.

---

## Step 2: Add WhatsApp to your app

1. In your app dashboard, click **Add Product**.
2. Find **WhatsApp** and click **Set up**.
3. Meta will create a **test phone number** and a **WhatsApp Business Account** for development.

---

## Step 3: Get your temporary access token

1. In the left sidebar, open **WhatsApp** → **API Setup**.
2. Under **Temporary access token**, click **Generate** (or copy the existing token).
3. Copy the token — you'll add it to Vercel as `WHATSAPP_ACCESS_TOKEN`.

> **Note:** Temporary tokens expire in **24 hours**. For production, create a [System User](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens) with a permanent token.

Also note your **Phone number ID** on this page (you don't need to paste it in env vars — Meta sends it with each webhook event).

---

## Step 4: Add a test recipient number

While in development mode, WhatsApp only delivers messages to **verified test numbers**:

1. On the **API Setup** page, find **To** (or **Send and receive messages**).
2. Click **Manage phone number list** (or **Add phone number**).
3. Enter your personal WhatsApp number (with country code, e.g. `+60123456789`).
4. Confirm the verification code sent to your phone.

---

## Step 5: Configure the webhook on Meta

1. In the left sidebar, go to **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit**.
3. Enter your callback URL:

   ```
   https://your-domain.vercel.app/api/whatsapp
   ```

   Replace `your-domain.vercel.app` with your actual Vercel domain (e.g. `otorekod.vercel.app`).

4. Enter the **Verify token**:

   ```
   OTOREKOD_VERIFY_TOKEN
   ```

   This must match exactly — it is hard-coded in `app/api/whatsapp/route.ts`.

5. Click **Verify and save**.
6. Subscribe to the **messages** webhook field (check the box and save).

Meta will send a GET request to your URL. If verification succeeds, you'll see a green checkmark.

---

## Step 6: Add environment variables

Add these to **Vercel** (Project → Settings → Environment Variables) and to your local `.env.local`:

```env
# WhatsApp Cloud API — from Meta API Setup page
WHATSAPP_ACCESS_TOKEN=your-temporary-or-permanent-token

# Optional: used in confirmation message links
NEXT_PUBLIC_APP_URL=https://otorekod.vercel.app

# Required for webhook database writes (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Already required for AI receipt parsing
GEMINI_API_KEY=your-gemini-api-key
```

Redeploy on Vercel after adding variables.

---

## Step 7: Link phone numbers in Supabase

The webhook matches incoming WhatsApp numbers to users via the `profiles.phone_number` column.

1. Open **Supabase Dashboard** → **Table Editor** → `profiles`.
2. Ensure each user has a `phone_number` stored (Malaysian formats are fine):
   - `60123456789`
   - `+60123456789`
   - `0123456789`

The webhook matches on the **last 9 digits**, so country-code variations still work.

Each user must also have at least **one vehicle** in the `vehicles` table. The most recently added vehicle is used as the active vehicle.

---

## Step 8: Test the flow

1. Open WhatsApp on your verified test phone.
2. Send a message to the **Meta test WhatsApp number** shown on the API Setup page.
3. Attach or send a **photo of a workshop receipt**.
4. Within a few seconds you should receive:

   ```
   RM 250.00 logged for your Saga! View your updated passport here: https://otorekod.vercel.app/shared/your-vehicle-id
   ```

5. Confirm the receipt appears in your OtoRekod dashboard and on the shared passport page.

---

## How the webhook works

| Step | Action |
|------|--------|
| GET `/api/whatsapp` | Meta verifies your server using `OTOREKOD_VERIFY_TOKEN` |
| POST `/api/whatsapp` | Receives incoming messages |
| Image received | Downloads media from Meta → parses with Gemini → saves to `receipts` |
| User lookup | Matches sender phone to `profiles.phone_number` |
| Vehicle | Uses the user's most recent vehicle |
| Reply | Sends confirmation with shared passport link |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Webhook verification fails | Confirm URL is live, token is exactly `OTOREKOD_VERIFY_TOKEN`, and the app is redeployed |
| No reply after sending image | Check Vercel function logs; confirm `WHATSAPP_ACCESS_TOKEN` is set |
| "Account not linked" | Add the sender's phone number to their `profiles` row in Supabase |
| "No vehicle" | User must add a vehicle on the OtoRekod website first |
| Token expired | Generate a new temporary token on Meta API Setup, or set up a permanent System User token |
| 401 on media download | Access token is invalid or expired — refresh it in Vercel |

---

## Going to production

1. Complete **Meta Business Verification** for your WhatsApp Business Account.
2. Add a **real business phone number** (not the Meta test number).
3. Switch from temporary token to a **permanent System User token**.
4. Submit your app for **App Review** if required for your use case.
5. Update `NEXT_PUBLIC_APP_URL` to your production domain.

---

## Security notes

- Never expose `WHATSAPP_ACCESS_TOKEN` or `SUPABASE_SERVICE_ROLE_KEY` in client-side code.
- The verify token `OTOREKOD_VERIFY_TOKEN` is only used during Meta's one-time webhook setup handshake.
- Only image messages are processed; all other message types are ignored.
