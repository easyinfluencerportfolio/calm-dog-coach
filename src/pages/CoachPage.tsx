import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/lib/brand";
import { api } from "../../convex/_generated/api";

const TRIGGERS = [
  "Other dogs on lead",
  "Dogs off lead",
  "Cyclists / scooters",
  "Cars / buses",
  "People / children",
  "Something else",
];

const ft = (m: number) => Math.round(m * 3.28084);
const dist = (m: number) => `${m} m (${ft(m)} ft)`;

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl leading-none">{value}</div>
      {sub ? (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}

/** Tiny renderer for the coach's markdown-ish output (headings, bullets, bold). */
function Read({ text }: { text: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      );
  const blocks = text.split("\n").filter(l => l.trim() !== "");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((line, i) => {
        const l = line.trim();
        if (l.startsWith("#")) {
          return (
            <h3
              key={i}
              className="pt-2 font-serif text-base tracking-tight text-[#14312B]"
            >
              {inline(l.replace(/^#+\s*/, ""))}
            </h3>
          );
        }
        if (/^([*-]|\d+\.)\s/.test(l)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-[#2F6F62]">&bull;</span>
              <span>{inline(l.replace(/^([*-]|\d+\.)\s*/, ""))}</span>
            </div>
          );
        }
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}

export function CoachPage() {
  const { token = "" } = useParams();
  const data = useQuery(api.coach.getByToken, { token });
  const logWalk = useMutation(api.coach.logWalk);
  const requestDebrief = useAction(api.coach.requestDebrief);

  const [reactions, setReactions] = useState(0);
  const [distance, setDistance] = useState("");
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [recovery, setRecovery] = useState("");
  const [calm, setCalm] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const chart = useMemo(() => {
    if (!data) return [];
    return [...data.walks]
      .sort((a, b) => a.walkedAt - b.walkedAt)
      .map(w => ({
        date: new Date(w.walkedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        distance: w.closestDistanceM,
        reactions: w.reactions,
      }));
  }, [data]);

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

  if (data.dog.active === false) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="font-serif text-2xl">Your subscription has ended</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your walk history is safe. Restart any time and this link works again.
          {BRAND.supportEmail ? ` Questions? Email ${BRAND.supportEmail}.` : ""}
        </p>
      </div>
    );
  }

  const { dog, walks, debriefs } = data;
  const last7 = walks.filter(w => w.walkedAt > Date.now() - 7 * 86400000);
  const bestDistance = walks.length
    ? Math.min(...walks.map(w => w.closestDistanceM))
    : (dog.baselineDistanceM ?? 0);
  let streak = 0;
  for (const w of walks) {
    if (w.reactions === 0) streak++;
    else break;
  }

  async function submit() {
    if (!distance) {
      toast.error("Add the closest distance you got to the trigger.");
      return;
    }
    setBusy(true);
    try {
      await logWalk({
        token,
        reactions,
        closestDistanceM: Number(distance),
        trigger,
        recoverySeconds: Number(recovery || 0),
        handlerCalm: calm,
        notes: notes || undefined,
      });
      toast.success("Walk logged.");
      setReactions(0);
      setDistance("");
      setRecovery("");
      setNotes("");
      void requestDebrief({ token }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#14312B]">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <img
            src={BRAND.logoUrl}
            alt={BRAND.logoAlt}
            className="h-10 w-auto"
          />
          <Badge variant="secondary" className="font-normal">
            {dog.dogName}'s coach
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-5 py-10">
        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {BRAND.coachName}
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
            {dog.dogName}, walk by walk
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Log a walk in six taps. You get a threshold read and a rewritten
            7-day card straight after — and a progress report at the end of
            every month, written from your own numbers.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Safe distance now"
            value={dist(bestDistance)}
            sub={
              dog.baselineDistanceM
                ? `started at ${dist(dog.baselineDistanceM)}`
                : undefined
            }
          />
          <Stat
            label="Reactions this week"
            value={String(last7.reduce((s, w) => s + w.reactions, 0))}
            sub={`${last7.length} walk${last7.length === 1 ? "" : "s"} logged`}
          />
          <Stat
            label="Calm streak"
            value={`${streak}`}
            sub="walks with zero reactions"
          />
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-serif text-xl">
              Closest distance you can hold
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Lower is better. This is the line that moves before anything else
              does.
            </p>
            <div className="mt-6 h-64">
              {chart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E4DFD5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      unit="m"
                      width={38}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="distance"
                      stroke={BRAND.accent}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Log your first walk and the line starts here.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-serif text-xl">Log a walk</h2>
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs">Reactions</Label>
                <div className="mt-2 flex gap-2">
                  {[0, 1, 2, 3, 4].map(n => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setReactions(n)}
                      className={`h-9 w-9 rounded-full border text-sm transition ${
                        reactions === n
                          ? "border-transparent bg-[#2F6F62] text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      {n === 4 ? "4+" : n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs" htmlFor="dist">
                  Closest distance (metres)
                </Label>
                <Input
                  id="dist"
                  inputMode="numeric"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. 12 (about 40 ft)"
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="trig">
                  Main trigger
                </Label>
                <select
                  id="trig"
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {TRIGGERS.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs" htmlFor="rec">
                  Recovery (seconds to settle)
                </Label>
                <Input
                  id="rec"
                  inputMode="numeric"
                  value={recovery}
                  onChange={e => setRecovery(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. 90"
                />
              </div>
              <div>
                <Label className="text-xs">
                  How calm did you feel? ({calm}/5)
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={calm}
                  onChange={e => setCalm(Number(e.target.value))}
                  className="mt-3 w-full accent-[#2F6F62]"
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="notes">
                  Anything else (optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <Button
                onClick={submit}
                disabled={busy}
                className="w-full bg-[#2F6F62] hover:bg-[#25594f]"
              >
                {busy ? "Saving…" : "Log walk & get my read"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Your coach's reads</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void requestDebrief({ token, kind: "monthly" });
                toast.success("Writing your progress report…");
              }}
            >
              Monthly report
            </Button>
          </div>
          {debriefs.length ? (
            <div className="mt-5 space-y-4">
              {debriefs.map(d => (
                <article key={d._id} className="rounded-xl border bg-white p-5">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="uppercase tracking-[0.14em]">
                      {d.kind === "monthly" ? "Monthly report" : "Walk debrief"}
                    </span>
                    <span>{new Date(d.createdAt).toLocaleString("en-GB")}</span>
                  </div>
                  <div className="mt-3">
                    {d.status === "working" ? (
                      <p className="text-sm text-muted-foreground">
                        Reading your walk…
                      </p>
                    ) : (
                      <Read text={d.body ?? ""} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Your first read appears here the moment you log a walk.
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-serif text-xl">Every walk you've logged</h2>
          {walks.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Date</th>
                    <th className="py-2 pr-4 font-normal">Trigger</th>
                    <th className="py-2 pr-4 font-normal">Reactions</th>
                    <th className="py-2 pr-4 font-normal">Closest</th>
                    <th className="py-2 pr-4 font-normal">Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {walks.map(w => (
                    <tr key={w._id} className="border-t">
                      <td className="py-2 pr-4">
                        {new Date(w.walkedAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-2 pr-4">{w.trigger}</td>
                      <td className="py-2 pr-4">{w.reactions}</td>
                      <td className="py-2 pr-4">{dist(w.closestDistanceM)}</td>
                      <td className="py-2 pr-4">{w.recoverySeconds}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing logged yet.
            </p>
          )}
        </section>

        <footer className="border-t pt-6 text-xs text-muted-foreground">
          {BRAND.footerNote} · This page is private to you — bookmark it.
        </footer>
      </main>
    </div>
  );
}
