/**
 * The 24 pre-rendered plans, keyed by behaviour + age band.
 * MEMBERS: after you re-host the PDFs on your own domain, swap these URLs. Nothing else changes.
 */
export const PLAN_FILES: Record<string, string> = {
  "B1-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727fe4291bd10ac5dbf.pdf",
  "B1-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727f6ac3438f8a14813.pdf",
  "B1-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7275e8f9cd8f585511a.pdf",
  "B2-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7271eb55bdfc3220d0b.pdf",
  "B2-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727fd7395b78a0908ac.pdf",
  "B2-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727f6ac3438f8a1480b.pdf",
  "B3-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7279115899f03002396.pdf",
  "B3-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727a6a03cda06bc8078.pdf",
  "B3-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7279115899f030023a4.pdf",
  "B4-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce72712ab41108ed67e74.pdf",
  "B4-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce72712ab41108ed67e70.pdf",
  "B4-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce727b1a56ba929788941.pdf",
  "B5-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce728a6a03cda06bc8096.pdf",
  "B5-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce72812ab41108ed67e8f.pdf",
  "B5-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce728fe4291bd10ac6238.pdf",
  "B6-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce728a6a03cda06bc80a3.pdf",
  "B6-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce728fd7395b78a090906.pdf",
  "B6-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7285e8f9cd8f5855148.pdf",
  "B7-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce72912ab41108ed67ebd.pdf",
  "B7-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce729fe4291bd10ac6706.pdf",
  "B7-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce729a6a03cda06bc80e8.pdf",
  "B8-A1":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce729f6ac3438f8a148a8.pdf",
  "B8-A2":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce729a6a03cda06bc80f5.pdf",
  "B8-A3":
    "https://assets.cdn.filesafe.space/f5hSjABcsKnb8c4aNRwm/media/6a7ce7295e8f9cd8f585517c.pdf",
};

export const BEHAVIOURS: { code: string; label: string }[] = [
  { code: "B1", label: "Lunges, barks or growls at other dogs on lead" },
  { code: "B2", label: "Barks, growls or backs away from people and visitors" },
  { code: "B3", label: "Panics when left alone" },
  { code: "B4", label: "Destroys the house" },
  { code: "B5", label: "Pulls so hard the walk is unmanageable" },
  { code: "B6", label: "Guards food, toys or furniture" },
  { code: "B7", label: "Terrified of noises" },
  { code: "B8", label: "Never settles" },
  { code: "OTHER", label: "Something else, I'll describe it" },
];

export const AGE_BANDS: { code: string; label: string }[] = [
  { code: "A1", label: "Under 12 months" },
  { code: "A2", label: "1 to 7 years" },
  { code: "A3", label: "8 years and over" },
];
