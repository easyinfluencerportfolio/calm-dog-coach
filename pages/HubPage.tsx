import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/lib/brand";
import { api } from "../../convex/_generated/api";
import { AGE_BANDS, BEHAVIOURS } from "../../convex/planFiles";

const WHERE = [
  "On the pavement near home",
  "In the park",
  "In the car or on the way out",
  "At the front door",
  "Indoors, all over the house",
  "Everywhere, no pattern",
];

const HOME = [
  "Flat or no garden",
  "House with a garden",
  "There are children at home",
  "There are other pets at home",
];

/** Slug for jump links, so the contents menu can scroll to a section. */
function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Renders the composed plan: H2 sections with a jump-to menu, H3 sub-headings,
 * callouts, bullets, bold and markdown tables. The plan is read on a phone by
 * a worried owner, so the job here is scannability before beauty.
 */
function Read({ text }: { text: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-[#14312B]">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      );

  const lines = text.split("\n");
  const headings: string[] = [];
  for (const l of lines) {
    const m = l.trim().match(/^##\s+(?!#)(.*)$/);
    if (m) headings.push(m[1].trim());
  }

  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (l === "") {
      i++;
      continue;
    }

    // markdown table
    if (l.startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map(c => c.trim());
        if (!cells.every(c => /^-{2,}$/.test(c) || c === "")) rows.push(cells);
        i++;
      }
      out.push(
        <div
          key={`t${i}`}
          className="my-5 overflow-x-auto rounded-xl border border-[#E2DACB]"
        >
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {rows.map((r, ri) => (
                <tr
                  key={ri}
                  className={
                    ri === 0
                      ? "bg-[#14312B] text-white"
                      : ri % 2
                        ? "bg-white"
                        : "bg-[#FAF8F4]"
                  }
                >
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="border-b border-[#E9E2D5] px-3 py-2 align-top last:border-r-0"
                    >
                      {ri === 0 ? <strong>{c}</strong> : inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // callout
    if (l.startsWith(">")) {
      out.push(
        <div
          key={i}
          className="my-5 break-inside-avoid rounded-r-lg border-l-4 border-[#C8A24A] bg-[#FBF7EC] px-5 py-4 font-serif text-[15px] leading-snug text-[#14312B]"
        >
          {inline(l.replace(/^>\s*/, ""))}
        </div>,
      );
      i++;
      continue;
    }

    // H2 section opener, numbered and anchored
    const h2 = l.match(/^##\s+(?!#)(.*)$/);
    if (h2) {
      const title = h2[1].trim();
      const n = headings.indexOf(title) + 1;
      out.push(
        <h2
          key={i}
          id={slug(title)}
          className="mt-12 scroll-mt-6 border-t border-[#E2DACB] pt-8 font-serif text-[22px] leading-tight tracking-tight text-[#14312B] first:mt-0 first:border-0 first:pt-0"
        >
          <span className="mr-3 text-[13px] font-normal tracking-[0.15em] text-[#C8A24A]">
            {String(n).padStart(2, "0")}
          </span>
          {inline(title)}
        </h2>,
      );
      i++;
      continue;
    }

    // H3 sub-heading
    const h3 = l.match(/^###\s+(.*)$/);
    if (h3) {
      out.push(
        <h3
          key={i}
          className="mt-7 font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-[#2F6F62]"
        >
          {inline(h3[1].trim())}
        </h3>,
      );
      i++;
      continue;
    }

    // bullet or numbered step
    if (/^([*-]|\d+\.)\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^([*-]|\d+\.)\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([*-]|\d+\.)\s*/, ""));
        i++;
      }
      out.push(
        <ul key={`l${i}`} className="my-3 space-y-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-3">
              <span
                aria-hidden
                className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#C8A24A]"
              />
              <span className="flex-1">{inline(it)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    out.push(
      <p key={i} className="my-3">
        {inline(l)}
      </p>,
    );
    i++;
  }

  return (
    <div>
      {headings.length > 2 ? (
        <nav className="mb-10 rounded-xl border border-[#E2DACB] bg-[#FAF8F4] p-5 print:hidden">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Jump to
          </p>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {headings.map((h, hi) => (
              <li key={h} className="flex gap-2 text-[13px]">
                <span className="text-[#C8A24A]">
                  {String(hi + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#${slug(h)}`}
                  className="text-[#2F6F62] underline-offset-4 hover:underline"
                >
                  {h}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="text-[15px] leading-[1.7] text-[#2A3A36]">{out}</div>
    </div>
  );
}

export function HubPage() {
  const { token = "" } = useParams();
  const data = useQuery(api.hub.getByToken, { token });
  const createMatched = useMutation(api.hub.createMatchedPlan);
  const compose = useAction(api.hub.composePlan);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  const [dogName, setDogName] = useState("");
  const [behaviour, setBehaviour] = useState("B1");
  const [ageBand, setAgeBand] = useState("A2");
  const [where, setWhere] = useState(WHERE[0]);
  const [home, setHome] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [ownTrigger, setOwnTrigger] = useState("");

  if (data === undefined) {
    return (
      <div className="p-16 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (data === null) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="font-serif text-2xl">This link isn't active</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Check the link in your welcome email{BRAND.supportEmail ? `, or email ${BRAND.supportEmail}` : ""}.
        </p>
      </div>
    );
  }

  if (data.owner.active === false) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="font-serif text-2xl">Your subscription has ended</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your saved plans are safe. Restart any time and this link works again.
          {BRAND.supportEmail ? ` Questions? Email ${BRAND.supportEmail}.` : ""}
        </p>
      </div>
    );
  }

  const { owner, plans } = data;
  const current = plans.find(p => p._id === openPlan);

  function reset() {
    setDogName("");
    setBehaviour("B1");
    setAgeBand("A2");
    setWhere(WHERE[0]);
    setHome([]);
    setSeverity(3);
    setOwnTrigger("");
  }

  async function build() {
    if (!dogName.trim()) {
      toast.error("What is your dog called?");
      return;
    }
    if (behaviour === "OTHER" && ownTrigger.trim().length < 10) {
      toast.error("Tell me what he does, in a sentence or two.");
      return;
    }
    const needsWriting = behaviour === "OTHER" || ownTrigger.trim().length > 0;
    setBusy(true);
    try {
      const args = {
        token,
        dogName: dogName.trim(),
        behaviour,
        ageBand,
        where,
        home,
        severity,
        ownTrigger: ownTrigger.trim() || undefined,
      };
      if (needsWriting) {
        toast.info("Writing this one for your dog. About a minute.");
        const id = await compose(args);
        setOpenPlan(id);
        toast.success("Plan ready.");
      } else {
        await createMatched(args);
        toast.success("Plan ready.");
      }
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#14312B]">
      <header className="border-b bg-white/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <img
            src={BRAND.logoUrl}
            alt={BRAND.logoAlt}
            className="h-10 w-auto"
          />
          <Badge variant="secondary" className="font-normal">
            {owner.ownerName ? `${owner.ownerName}'s plans` : "Your plans"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-5 py-10">
        {current ? (
          <section>
            <div className="mx-auto flex max-w-3xl items-center justify-between print:hidden">
              <Button variant="ghost" onClick={() => setOpenPlan(null)}>
                ← All plans
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Print or save as PDF
              </Button>
            </div>
            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border bg-white p-8 sm:p-10 print:border-0 print:p-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                14 day plan
              </p>
              <h1 className="mt-2 font-serif text-3xl">
                A 14 day plan for {current.dogName}
              </h1>
              {current.ownTrigger ? (
                <p className="mt-2 max-w-[52ch] text-[15px] italic text-muted-foreground">
                  &ldquo;{current.ownTrigger}&rdquo;
                </p>
              ) : null}
              <div className="mt-8">
                {current.status === "working" ? (
                  <p className="text-sm text-muted-foreground">
                    Writing this plan now. It takes about a minute — this page
                    updates on its own.
                  </p>
                ) : (
                  <Read text={current.body ?? ""} />
                )}
              </div>
            </div>
          </section>
        ) : (
          <>
            <section>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {BRAND.productName}
              </p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
                Every plan, whenever you need one
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A new problem, a new dog, a new trigger: answer the same six
                questions and you get a fresh 14-day plan built for that case.
                No limit, nothing to wait for.
              </p>
              <Button
                className="mt-6"
                onClick={() => setOpen(o => !o)}
                style={{ backgroundColor: BRAND.accent }}
              >
                {open ? "Close" : "Build a new plan"}
              </Button>
            </section>

            {open ? (
              <section className="rounded-2xl border bg-white p-6 sm:p-8">
                <h2 className="font-serif text-xl">Six questions</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label>1. What is your dog called?</Label>
                    <Input
                      className="mt-2"
                      value={dogName}
                      onChange={e => setDogName(e.target.value)}
                      placeholder="Milo"
                    />
                  </div>
                  <div>
                    <Label>3. How old is your dog?</Label>
                    <select
                      className="mt-2 h-9 w-full rounded-md border bg-white px-3 text-sm"
                      value={ageBand}
                      onChange={e => setAgeBand(e.target.value)}
                    >
                      {AGE_BANDS.map(a => (
                        <option key={a.code} value={a.code}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>2. What is the biggest problem right now?</Label>
                    <select
                      className="mt-2 h-9 w-full rounded-md border bg-white px-3 text-sm"
                      value={behaviour}
                      onChange={e => setBehaviour(e.target.value)}
                    >
                      {BEHAVIOURS.map(b => (
                        <option key={b.code} value={b.code}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    {behaviour === "OTHER" ? (
                      <div className="mt-3 rounded-lg border border-[#C8A24A]/50 bg-[#FBF7EC] p-4">
                        <Label htmlFor="describe">
                          Describe it in your own words
                        </Label>
                        <Textarea
                          id="describe"
                          autoFocus
                          rows={4}
                          className="mt-2 bg-white"
                          value={ownTrigger}
                          onChange={e => setOwnTrigger(e.target.value)}
                          placeholder="What does he do, when does he do it, and what sets him off? For example: he ignores other dogs completely but loses it at wheelie bins and bin lorries."
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Write it the way you'd say it to a friend. The whole
                          plan gets built around this, so the more specific you
                          are, the better it fits. Takes about a minute.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <Label>4. Where does it happen most?</Label>
                    <select
                      className="mt-2 h-9 w-full rounded-md border bg-white px-3 text-sm"
                      value={where}
                      onChange={e => setWhere(e.target.value)}
                    >
                      {WHERE.map(w => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>6. How bad is it, 1 to 5?</Label>
                    <div className="mt-2 flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSeverity(n)}
                          className={`h-9 w-9 rounded-md border text-sm ${
                            severity === n
                              ? "bg-[#2F6F62] text-white"
                              : "bg-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>5. What is your home like?</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {HOME.map(h => (
                        <label
                          key={h}
                          className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={home.includes(h)}
                            onChange={e =>
                              setHome(prev =>
                                e.target.checked
                                  ? [...prev, h]
                                  : prev.filter(x => x !== h),
                              )
                            }
                          />
                          {h}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div
                    className={`sm:col-span-2 ${behaviour === "OTHER" ? "hidden" : ""}`}
                  >
                    <Label>
                      Anything specific that sets your dog off? (optional)
                    </Label>
                    <Textarea
                      className="mt-2"
                      value={ownTrigger}
                      onChange={e => setOwnTrigger(e.target.value)}
                      placeholder="He ignores other dogs but loses it at wheelie bins and bin lorries"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Fill this in and the plan gets written around that exact
                      trigger instead of the standard track. Takes about a
                      minute.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-6"
                  disabled={busy}
                  onClick={() => void build()}
                  style={{ backgroundColor: BRAND.accent }}
                >
                  {busy ? "Building…" : "Build my plan"}
                </Button>
              </section>
            ) : null}

            <section>
              <h2 className="font-serif text-xl">Your plans</h2>
              {plans.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing here yet. Build your first plan above.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {plans.map(p => (
                    <div
                      key={p._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-5 py-4"
                    >
                      <div>
                        <div className="font-serif text-lg">
                          {p.dogName}
                          <span className="ml-2 text-sm text-muted-foreground">
                            {p.ownTrigger
                              ? p.ownTrigger
                              : (BEHAVIOURS.find(b => b.code === p.behaviour)
                                  ?.label ?? "")}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {p.mode === "composed"
                            ? " · written for your dog"
                            : ""}
                        </div>
                      </div>
                      {p.mode === "matched" && p.pdfUrl ? (
                        <Button asChild variant="outline">
                          <a
                            href={p.pdfUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Open plan
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setOpenPlan(p._id)}
                        >
                          {p.status === "working" ? "Writing…" : "Open plan"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t bg-white/60 print:hidden">
        <div className="mx-auto max-w-5xl px-5 py-6 text-xs text-muted-foreground">
          {BRAND.footerNote}
        </div>
      </footer>
    </div>
  );
}
