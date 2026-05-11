"use client";

import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import TopActions from "@/components/TopActions";
import { Button, Card, CardBody, CardHeader, Input, Badge } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { cx } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "archived";
  health: "on_track" | "at_risk" | "off_track";
};

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Project["status"]>("all");

  async function load() {
    setLoading(true);
    setMsg("");
    const res = await supabase
      .from("projects")
      .select("id,name,start_date,end_date,status,health")
      .order("created_at", { ascending: false });

    if (res.error) setMsg(res.error.message);
    setItems((res.data || []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const view = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (qq && !p.name.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [items, q, status]);

  function statusBadge(p: Project) {
    if (p.status === "completed") return <Badge type="ok" text="Completed" />;
    if (p.status === "archived") return <Badge type="warn" text="Archived" />;
    return <Badge type="warn" text="Active" />;
  }

  async function createProject() {
    setMsg("");
    if (!name.trim()) return setMsg("Nama project wajib diisi.");
    const ins = await supabase.from("projects").insert({
      name: name.trim(),
      start_date: start || null,
      end_date: end || null,
      status: "active",
      health: "on_track",
    });
    if (ins.error) return setMsg(ins.error.message);
    setName(""); setStart(""); setEnd("");
    await load();
  }

  async function markCompleted(p: Project) {
    setMsg("");
    if (!p.end_date) return setMsg("Mark completed butuh end_date (due panjar = end_date + 7).");
    const up = await supabase.from("projects").update({ status: "completed" }).eq("id", p.id);
    if (up.error) return setMsg(up.error.message);
    await load();
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">Klik project untuk detail (tasks + panjar + members).</p>
          </div>
          <TopActions />
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Create Project" hint="Simple. Cepat." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Nama project" value={name} onChange={(e) => setName(e.target.value)} />
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                <Button onClick={createProject}>Create</Button>
              </div>
              {msg && <div className="text-sm text-red-600 mt-3">{msg}</div>}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <Input placeholder="Search project..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="px-3 py-2 rounded-xl border text-sm">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <Button variant="ghost" onClick={load} className="border border-gray-200">Refresh</Button>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Project List" hint="Desktop: table. Mobile: cards." />
            <CardBody>
              {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : view.length === 0 ? (
                <div className="text-sm text-gray-500">Tidak ada data.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-gray-500">
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2">Project</th>
                          <th className="text-left py-2 pr-2">Start</th>
                          <th className="text-left py-2 pr-2">End</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.map((p) => (
                          <tr key={p.id} className="border-b last:border-b-0">
                            <td className="py-3 pr-2">
                              <Link href={`/projects/${p.id}`} className="font-extrabold underline underline-offset-4">
                                {p.name}
                              </Link>
                              <div className="text-xs text-gray-500">{p.id}</div>
                            </td>
                            <td className="py-3 pr-2">{p.start_date || "-"}</td>
                            <td className="py-3 pr-2">{p.end_date || "-"}</td>
                            <td className="py-3 pr-2">{statusBadge(p)}</td>
                            <td className="py-3 pr-2">
                              {p.status !== "completed" ? (
                                <Button onClick={() => markCompleted(p)}>Mark Completed</Button>
                              ) : <span className="text-xs text-gray-500">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {view.map((p) => (
                      <div key={p.id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/projects/${p.id}`} className="font-extrabold underline underline-offset-4">
                              {p.name}
                            </Link>
                            <div className="text-xs text-gray-500 mt-1">{p.id}</div>
                          </div>
                          {statusBadge(p)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div className="text-gray-500">Start</div><div className="font-semibold">{p.start_date || "-"}</div>
                          <div className="text-gray-500">End</div><div className="font-semibold">{p.end_date || "-"}</div>
                        </div>

                        <div className="mt-3">
                          {p.status !== "completed" ? (
                            <Button onClick={() => markCompleted(p)} className={cx("w-full", !p.end_date && "opacity-60")}>
                              Mark Completed
                            </Button>
                          ) : <div className="text-xs text-gray-500">Completed.</div>}
                          {!p.end_date && p.status !== "completed" && (
                            <div className="text-xs text-gray-500 mt-2">Isi <b>end_date</b> dulu supaya bisa completed.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
