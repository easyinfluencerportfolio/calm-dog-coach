# The Calm Dog Coach

This is the app behind the 27 a month subscription in The Calm Dog Plan funnel. Your customers get a private link after they buy, and the app holds their dog's plan, their walk log and their fortnightly re-check.

You are about to make your own copy of it. Nobody else's customers touch your copy, and nobody else can see your data.

## Deploy your own copy

Click the button. It signs you in with GitHub, copies this app into your own account, creates your own database and puts it live.

[![Deploy with Vercel](https://vercel.com/button)](DEPLOY_URL_PLACEHOLDER)

It takes about two minutes. When it finishes you get a web address ending in `.vercel.app`. That is your app URL, and you will paste it into GoHighLevel in a moment.

## The two settings you need to fill in

During the deploy you are asked for two values.

**`VITE_SUPPORT_EMAIL`** is the email address your customers see if they need help. Use your own support address. It is never shared with anyone and it is not sent anywhere, it only appears on the page.

**`GHL_WEBHOOK_SECRET`** is a password you invent, right there on the spot. Any long string of letters and numbers will do. Its only job is to let your GoHighLevel account switch a customer's access on and off when they subscribe or cancel. Keep a copy, you will paste it into GoHighLevel too.

## Connecting it to GoHighLevel

In your GoHighLevel sub-account, go to Settings, then Custom Values, and fill in:

- `app_url` with your new web address
- `app_secret` with the `GHL_WEBHOOK_SECRET` you invented
- `checkout_link` with the address of your sales page

That is the whole connection. The workflows that came with the snapshot do the rest: when someone subscribes their access switches on, and when they cancel it switches off at the end of the period they have already paid for.

## Running it on your own computer

You do not need to do this. It is here for anyone who wants to change the app.

```bash
bun install
bunx convex dev
bun run dev
```

## What is inside

React and Vite on the front, Convex for the database and the scheduled jobs. The customer facing pages are the Plan Room and the Coach dashboard, both reached through a private link rather than a login, so your customers never have to create an account.
