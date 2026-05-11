"use client";

import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import TopActions from "@/components/TopActions";
import { Badge, Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { formatIDR, todayISO } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type Project = { id: string; name: string; status: "active" | "completed" | "archived"; end_date: string | null };
type Profile = { id: string; full_name: string; role: string };
type Panjar = {
  id: string;
  project_id: string;
  receiver_user_id: string;
  amount: number;
  disburse_date: string;
  due_settlement: string | null;
  settled_at: string | null;
  note: string | null;
};

export default function PanjarPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<Panjar[]>([]);
  const [msg, setMsg] = useState("");

  const [projectId, setProjectId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [disburse, setDisburse] = useState("");
  const [note, setNote] = useState("");

  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "overdue" | "settled">("all");

  const today = todayISO();

  async function boot() {
    setMsg("");
    const p = await supabase.from("projects").select("id,name,status,end_date").order("created_at", { ascending: false });
    const u = await supabase.from("profiles").select("id,full_name,role").order("full_name", { ascending: true });
    setProjects((p.data || []) as any);
    setProfiles((u.data || []) as any);

    setDisburse(todayISO());
    await load();
  }

  async function load() {
    setMsg("");
    let q = supabase
      .from("panjar")
      .select("id,project_id,receiver_user_id,amount,disburse_date,due_settlement,settled_at,note")
      .order("created_at", { ascending: false });

    if (filterProject) q = q.eq("project_id", filterProject);

    const res = await q;
    if (res.error) setMsg(res.error.message);
    setRows((res.data || []) as any);
  }

  useEffect(() => { boot(); }, []);
  useEffect(() => { load(); }, [filterProject]);

  const userMap = useMemo(() => new Map(profiles.map((u) => [u.id, u.full_name])), [profiles]);

  function statusOf(r: Panjar) {
    if (r.settled_at) return "settled";
    if (r.due_settlement && r.due_settlement < today) return "overdue";
    return "open";
  }

  const filtered = useMemo(() => {
    if (filterStatus === "all") return rows;
    return rows.filter((r) => statusOf(r) === filterStatus);
  }, [rows, filterStatus, today]);

  const totals = useMemo(() => {
    const sum = (a: Panjar[]) => a.reduce((acc, it) => acc + Number(it.amount || 0), 0);
    const open = rows.filter((r) => statusOf(r) === "open");
    const overdue = rows.filter((r) => statusOf(r) === "overdue");
    const settled = rows.filter((r) => statusOf(r) === "settled");
    return { open: sum(open), overdue: sum(overdue), settled: sum(settled), overdueCount: overdue.length };
  }, [rows, today]);

  async function addPanjar() {
    setMsg("");
    if (!projectId) return setMsg("Project wajib dipilih.");
    if (!receiverId) return setMsg("Receiver (PIC) wajib dipilih.");
    const amt = Number(amount.replace(/[^\d]/g, ""));
    if (!amt) return setMsg("Nominal wajib diisi.");
    if (!disburse) return setMsg("Tanggal cair wajib diisi.");

    const ins = await supabase.from("panjar").insert({
      project_id: projectId,
      receiver_user_id: receiverId,
      amount: amt,
      disburse_date: disburse,
      due_settlement: null,
      note: note || null,
    });
    if (ins.error) return setMsg(ins.error.message);

    setAmount("");
    setNote("");
    await load();
  }

  async function markSettled(id: string) {
    setMsg("");
    const up = await supabase.from("panjar").update({ settled_at: new Date().toISOString() }).eq("id", id);
    if (up.error) return setMsg(up.error.message);
    await load();
  }

  function badge(r: Panjar) {
    const st = statusOf(r);
    if (st === "settled") return <Badge type="ok" text="Settled" />;
    if (st === "overdue") return <Badge type="bad" text="Overdue" />;
    return <Badge type="warn" text="Open" />;
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold">Panjar</h1>
            <p className="text-sm text-gray-500 mt-1">Rule settlement H+7 setelah project status <b>completed</b>.</p>
          </div>
          <TopActions />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-gray-500 font-bold">Open</div>
            <div className="text-xl font-extrabold mt-1">{formatIDR(totals.open)}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-gray-500 font-bold">Overdue</div>
            <div className="text-xl font-extrabold mt-1">{formatIDR(totals.overdue)}</div>
            <div className="text-xs text-gray-500 mt-1">{totals.overdueCount} transaksi</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-gray-500 font-bold">Settled</div>
            <div className="text-xl font-extrabold mt-1">{formatIDR(totals.settled)}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-gray-500 font-bold">Note</div>
            <div className="text-sm font-extrabold mt-2">Due muncul setelah completed</div>
            <div className="text-xs text-gray-500">trigger: end_date + 7</div>
          </div>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Add Panjar" hint="Ringkas: jumlah, kapan cair, ke siapa." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Pilih Project</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.status})</option>))}
                </Select>
                <Select value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
                  <option value="">Receiver (PIC)</option>
                  {profiles.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
                </Select>
                <Input placeholder="Nominal (contoh 7500000)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Input type="date" value={disburse} onChange={(e) => setDisburse(e.target.value)} />
                <Button onClick={addPanjar}>Save</Button>
              </div>
              <div className="mt-2">
                <Input placeholder="Keterangan (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {msg && <div className="text-sm text-red-600 mt-3">{msg}</div>}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </Select>

          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
            <option value="settled">Settled</option>
          </Select>

          <Button variant="ghost" onClick={load} className="border border-gray-200">Refresh</Button>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Panjar List" hint="Desktop: table. Mobile: cards." />
            <CardBody>
              {filtered.length === 0 ? (
                <div className="text-sm text-gray-500">Tidak ada data.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-gray-500">
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2">Project</th>
                          <th className="text-left py-2 pr-2">Receiver</th>
                          <th className="text-left py-2 pr-2">Nominal</th>
                          <th className="text-left py-2 pr-2">Cair</th>
                          <th className="text-left py-2 pr-2">Due</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id} className="border-b last:border-b-0">
                            <td className="py-3 pr-2">{r.project_id}</td>
                            <td className="py-3 pr-2">{userMap.get(r.receiver_user_id) || "-"}</td>
                            <td className="py-3 pr-2 font-extrabold">{formatIDR(Number(r.amount))}</td>
                            <td className="py-3 pr-2">{r.disburse_date}</td>
                            <td className="py-3 pr-2 font-extrabold">{r.due_settlement || "-"}</td>
                            <td className="py-3 pr-2">{badge(r)}</td>
                            <td className="py-3 pr-2">
                              {!r.settled_at ? <Button onClick={() => markSettled(r.id)}>Mark Settled</Button> : <span className="text-xs text-gray-500">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {filtered.map((r) => (
                      <div key={r.id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-extrabold mt-1">{formatIDR(Number(r.amount))}</div>
                            <div className="text-xs text-gray-500 mt-1">{r.id}</div>
                          </div>
                          {badge(r)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div className="text-gray-500">Receiver</div>
                          <div className="font-semibold">{userMap.get(r.receiver_user_id) || "-"}</div>
                          <div className="text-gray-500">Cair</div>
                          <div className="font-semibold">{r.disburse_date}</div>
                          <div className="text-gray-500">Due</div>
                          <div className="font-semibold">{r.due_settlement || "-"}</div>
                        </div>

                        {!r.settled_at && (
                          <div className="mt-3">
                            <Button onClick={() => markSettled(r.id)} className="w-full">Mark Settled</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {msg && <div className="text-sm text-red-600 mt-3">{msg}</div>}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
