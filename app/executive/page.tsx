"use client";

import { supabase } from "@/lib/supabase";
import { formatIDR } from "@/lib/utils";
import { useEffect, useState } from "react";

type RiskProject = { id: string; name: string; health: string; status: string; end_date: string | null };
type OverdueProject = { id: string; name: string; health: string; end_date: string | null; overdue_tasks: number; overdue_panjar_amount: number };
type Point = { d: string; v: number };

function pctChange(from: number, to: number) {
  if (from === 0 && to === 0) return 0;
  if (from === 0) return 100;
  return ((to - from) / from) * 100;
}

function sparkline(values: number[]) {
  const chars = ["▁","▂","▃","▄","▅","▆","▇","█"];
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return "▁".repeat(values.length);
  return values.map(v => {
    const t = (v - min) / (max - min);
    const idx = Math.max(0, Math.min(chars.length - 1, Math.round(t * (chars.length - 1))));
    return chars[idx];
  }).join("");
}

function TrendCard({
  title,
  series,
  formatter,
}: {
  title: string;
  series: Point[];
  formatter?: (n: number) => string;
}) {
  const vals = series.map(x => Number(x.v || 0));
  const first = vals[0] ?? 0;
  const last = vals[vals.length - 1] ?? 0;
  const delta = pctChange(first, last);
  const up = delta >= 0;
  const spark = sparkline(vals);
  const pretty = formatter ? formatter(last) : String(last);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500 font-bold">{title}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold">{pretty}</div>
          <div className={`text-xs font-bold mt-1 ${up ? "text-green-700" : "text-red-700"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs awal periode
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-gray-600">{spark}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {series[0]?.d} → {series[series.length - 1]?.d}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Executive() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  const [days, setDays] = useState<number>(30);
  const [token, setToken] = useState<string>("");

  async function fetchData(tok: string, d: number) {
    setErr("");
    setData(null);
    const res = await supabase.rpc("get_public_dashboard_v3", { p_token: tok, p_days: d });
    if (res.error) {
      setErr("Unauthorized / token salah.");
      return;
    }
    setData(res.data);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token") || "";
    const d = Number(params.get("days") || "30");
    const safeDays = [7, 30, 90].includes(d) ? d : 30;

    setToken(tok);
    setDays(safeDays);

    if (!tok) {
      setErr("Missing token. Gunakan link yang dibagikan PM Lead.");
      return;
    }
    fetchData(tok, safeDays);
  }, []);

  function updateQuery(newDays: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("days", String(newDays));
    window.history.replaceState({}, "", url.toString());
    setDays(newDays);
    fetchData(token, newDays);
  }

  const topRisk: RiskProject[] = data?.top_risk_projects || [];
  const topOverdue: OverdueProject[] = data?.top_overdue_by_project || [];

  const tasksSeries: Point[] = data?.trend?.tasks_overdue_series || [];
  const panjarSeries: Point[] = data?.trend?.panjar_overdue_amount_series || [];
  const completionSeries: Point[] = data?.trend?.projects_completed_series || [];

  const healthLabel = (h: string) => (h === "off_track" ? "Off Track" : h === "at_risk" ? "At Risk" : "On Track");
  const healthCls = (h: string) =>
    h === "off_track" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";

  if (err) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border bg-white p-6">
          <div className="text-lg font-extrabold">Executive Dashboard</div>
          <div className="text-sm text-red-600 mt-2">{err}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-4">
        <div className="text-sm text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-gray-500">Public view (no login) • share link token</div>
            <h1 className="text-2xl font-extrabold">Executive Dashboard</h1>
            <div className="text-sm text-gray-500 mt-1">
              As of: <b>{data.as_of}</b> • Range: <b>{data.range_start}</b> → <b>{data.range_end}</b>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 font-bold">Timeframe</div>
            <select
              value={days}
              onChange={(e) => updateQuery(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border bg-white text-sm font-bold"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Projects Total</div>
            <div className="text-2xl font-extrabold mt-1">{data.projects_total}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Active</div>
            <div className="text-2xl font-extrabold mt-1">{data.projects_active}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Completed</div>
            <div className="text-2xl font-extrabold mt-1">{data.projects_completed}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Overdue Tasks (Now)</div>
            <div className="text-2xl font-extrabold mt-1">{data.tasks_overdue_count}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <TrendCard title="Trend: Overdue Tasks" series={tasksSeries} />
          <TrendCard title="Trend: Panjar Overdue Amount" series={panjarSeries} formatter={(n) => formatIDR(Number(n))} />
          <TrendCard title="Trend: Projects Completed" series={completionSeries} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Panjar Overdue Amount (Now)</div>
            <div className="text-2xl font-extrabold mt-1">{formatIDR(Number(data.panjar_overdue_amount || 0))}</div>
            <div className="text-xs text-gray-500 mt-2">Settlement: H+7 setelah project completed.</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500 font-bold">Top Risk Projects (Max 10)</div>
            {topRisk.length === 0 ? (
              <div className="text-sm text-gray-500 mt-2">Tidak ada project risk saat ini.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {topRisk.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-extrabold">{p.name}</div>
                      <div className="text-xs text-gray-500">End: {p.end_date || "-"}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-extrabold border ${healthCls(p.health)}`}>
                      {healthLabel(p.health)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 mt-3">
          <div className="text-xs text-gray-500 font-bold">Top Overdue by Project (Max 10)</div>
          {topOverdue.length === 0 ? (
            <div className="text-sm text-gray-500 mt-2">Tidak ada overdue yang terdeteksi.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {topOverdue.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold">{p.name}</div>
                    <div className="text-xs text-gray-500">End: {p.end_date || "-"} • Overdue Tasks: <b>{p.overdue_tasks}</b></div>
                    <div className="text-xs text-gray-500 mt-1">Overdue Panjar: <b>{formatIDR(Number(p.overdue_panjar_amount || 0))}</b></div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-extrabold border ${healthCls(p.health)}`}>
                    {healthLabel(p.health)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-6">
          Catatan: Dashboard publik ini hanya agregat + ringkasan. Detail internal tetap di aplikasi login.
        </div>
      </div>
    </div>
  );
}
