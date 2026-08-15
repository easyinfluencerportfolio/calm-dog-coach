/**
 * BRAND CONFIG — the only file a Platinum Club member needs to edit.
 * Swap the logo URL, name and accent, redeploy, done.
 */
export const BRAND = {
  productName: "The Calm Dog Plan",
  coachName: "Calm Dog Coach",
  logoUrl: "/logo.png",
  logoAlt: "The Calm Dog Plan",
  accent: "#2F6F62",
  // YOUR support email. This is the address YOUR customers will see, so put
  // your own business address here (or set VITE_SUPPORT_EMAIL in your host).
  // Leave it blank and the app simply will not show an email anywhere.
  supportEmail: (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? "",
  footerNote: "The Calm Dog Plan — walk-by-walk coaching for reactive dogs.",
};
