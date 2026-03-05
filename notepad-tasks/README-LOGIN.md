# Email login (Supabase)

Notes and tasks can be saved to your account when you sign in with email.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Enable Email auth**: Dashboard → Authentication → Providers → Email (on).

3. **Create the table**: Dashboard → SQL Editor → run the contents of `supabase-setup.sql`.

4. **Get API keys**: Dashboard → Project Settings → API. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

5. **Create `.env.local`** in this folder (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. Restart the dev server (`npm run dev`).

## Customize email sender (your org name)

Confirmation and password-reset emails are sent by Supabase. By default the sender appears as "Supabase". To use your own org or app name (and improve deliverability), use **custom SMTP**:

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Go to **Authentication** → **SMTP Settings** (or **Project Settings** → **Auth**).
3. Enable **Custom SMTP** and enter your provider’s details (host, port, user, password).
4. Set the **Sender email** (e.g. `no-reply@yourdomain.com`) and **Sender name** to your org or app name (e.g. "Acme Inc" or "My Notepad App"). The exact field name may be "Sender name", "From name", or "smtp_sender_name" depending on the UI.
5. Save. All auth emails (confirm signup, reset password, etc.) will then use your sender name and address.

If you use the Management API instead of the UI, set `smtp_sender_name` in the auth config (see [Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)).

## Usage

- **Login** in the top bar: sign in or create an account with email + password. Use **Forgot password?** on the sign-in form to receive a reset link by email.
- When signed in, your tasks, notes, notepad tabs, and settings are saved to your account and sync when you open the app on another device.
- **Sign out** returns you to local-only profiles (data stays in the browser).
