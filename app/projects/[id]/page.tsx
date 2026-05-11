"use client";

import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import TopActions from "@/components/TopActions";
import { Badge, Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { PAGE_SIZE, formatIDR, todayISO } from "@/lib/utils";
import { toCSV, downloadCSV } from "@/lib/csv";
import { useMe } from "@/lib/useMe";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "completed" | "archived";
  health: "on_track" | "at_risk" | "off_track";
  owner_id: string | null;
};

type Profile = { id: string; full_name: string; role: string };

type Task = {
  id: string;
  title: string;
  pic_user_id: string | null;
  due_date: string | null;
  priority: "p0" | "p1" | "p2" | "p3";
  status: "backlog" | "ready" | "in_progress" | "blocked" | "done";
  created_at?: string;
};

type Panjar = {
  id: string;
  receiver_user_id: string;
  amount: number;
  disburse_date: string;
  due_settlement: string | null;
  settled_at: string | null;
  note: string | null;
  created_at?: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();

  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Array<{ user_id: string; member_role: string }>>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(0);

  const [panjar, setPanjar] = useState<Panjar[]>([]);
  const [msg, setMsg] = useState("");

  const today = todayISO();
  const isLead = me.role === "pm_lead" || me.role === "admin";

  // Settings
  const [editEnd, setEditEnd] = useState("");
  const [editHealth, setEditHealth] = useState<Project["health"]>("on_track");

  // Task form
  const [tTitle, setTTitle] = useState("");
  const [tPIC, setTPIC] = useState("");
  const [tDue, setTDue] = useState("");
  const [tPriority, setTPriority] = useState<Task["priority"]>("p2");
  const [tStatus, setTStatus] = useState<Task["status"]>("backlog");

  // Panjar form
  const [pReceiver, setPReceiver] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pDisburse, setPDisburse] = useState(todayISO());
  const [pNote, setPNote] = useState("");

  const userMap = useMemo(() => new Map(profiles.map((u) => [u.id, u.full_name])), [profiles]);
  const memberUserIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);

  async function loadProject() {
    setMsg("");
    const p = await supabase
      .from("projects")
      .select("id,name,start_date,end_date,status,health,owner_id")
      .eq("id", id)
      .single();
    if (p.error) return setMsg(p.error.message);
    setProject(p.data as any);
  }

  async function loadProfiles() {
    const u = await supabase.from("profiles").select("id,full_name,role").order("full_name", { ascending: true });
    if (u.error) return setMsg(u.error.message);
    setProfiles((u.data || []) as any);
  }

  async function loadMembers() {
    const m = await supabase.from("project_members").select("user_id,member_role").eq("project_id", id);
    if (m.error) return setMsg(m.error.message);
    setMembers((m.data || []) as any);
  }

  async function loadTasks(page: number) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const t = await supabase
      .from("tasks")
      .select("id,title,pic_user_id,due_date,priority,status,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (t.error) return setMsg(t.error.message);
    setTasks((t.data || []) as any);
    setTaskPage(page);
  }

  async function loadPanjar() {
    const p = await supabase
      .from("panjar")
      .select("id,receiver_user_id,amount,disburse_date,due_settlement,settled_at,note,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (p.error) return setMsg(p.error.message);
    setPanjar((p.data || []) as any);
  }

  useEffect(() => {
    (async () => {
      await loadProject();
      await loadProfiles();
      await loadMembers();
      await loadTasks(0);
      await loadPanjar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (project) {
      setEditEnd(project.end_date || "");
      setEditHealth(project.health);
    }
  }, [project]);

  async function saveProjectMeta() {
    setMsg("");
    if (!isLead) return setMsg("Hanya PM Lead/Admin yang bisa update meta project.");
    const up = await supabase.from("projects").update({ end_date: editEnd || null, health: editHealth }).eq("id", id);
    if (up.error) return setMsg(up.error.message);
    await loadProject();
    await loadPanjar();
  }

  async function markCompleted() {
    setMsg("");
    if (!project) return;
    if (!isLead) return setMsg("Hanya PM Lead/Admin yang bisa Mark Completed.");
    if (!project.end_date && !editEnd) return setMsg("Isi end_date dulu. Due panjar dihitung end_date + 7.");

    if (!project.end_date && editEnd) {
      const upMeta = await supabase.from("projects").update({ end_date: editEnd }).eq("id", id);
      if (upMeta.error) return setMsg(upMeta.error.message);
    }

    const up = await supabase.from("projects").update({ status: "completed" }).eq("id", id);
    if (up.error) return setMsg(up.error.message);

    await loadProject();
    await loadPanjar();
  }

  async function addMember(userId: string) {
    setMsg("");
    if (!isLead) return setMsg("Hanya PM Lead/Admin yang bisa mengatur member.");
    if (!userId) return;
    const ins = await supabase.from("project_members").insert({ project_id: id, user_id: userId, member_role: "pm" });
    if (ins.error) return setMsg(ins.error.message);
    await loadMembers();
  }

  async function addTask() {
    setMsg("");
    if (!tTitle.trim()) return setMsg("Judul task wajib.");
    const ins = await supabase.from("tasks").insert({
      project_id: id,
      title: tTitle.trim(),
      pic_user_id: tPIC || null,
      due_date: tDue || null,
      priority: tPriority,
      status: tStatus,
    });
    if (ins.error) return setMsg(ins.error.message);

    setTTitle("");
    setTPIC("");
    setTDue("");
    setTPriority("p2");
    setTStatus("backlog");
    await loadTasks(0);
  }

  async function quickTaskStatus(taskId: string, next: Task["status"]) {
    const up = await supabase.from("tasks").update({ status: next }).eq("id", taskId);
    if (up.error) return setMsg(up.error.message);
    await loadTasks(taskPage);
  }

  async function addPanjarRow() {
    setMsg("");
    const amt = Number(pAmount.replace(/[^\d]/g, ""));
    if (!pReceiver) return setMsg("Receiver wajib dipilih.");
    if (!amt) return setMsg("Nominal wajib.");
    if (!pDisburse) return setMsg("Tanggal cair wajib.");
    const ins = await supabase.from("panjar").insert({
      project_id: id,
      receiver_user_id: pReceiver,
      amount: amt,
      disburse_date: pDisburse,
      due_settlement: null,
      note: pNote || null,
    });
    if (ins.error) return setMsg(ins.error.message);

    setPAmount("");
    setPNote("");
    await loadPanjar();
  }

  async function markSettled(panjarId: string) {
    const up = await supabase.from("panjar").update({ settled_at: new Date().toISOString() }).eq("id", panjarId);
    if (up.error) return setMsg(up.error.message);
    await loadPanjar();
  }

  function panjarStatus(r: Panjar) {
    if (r.settled_at) return <Badge type="ok" text="Settled" />;
    if (r.due_settlement && r.due_settlement < today) return <Badge type="bad" text="Overdue" />;
    return <Badge type="warn" text="Open" />;
  }

  async function exportTasksCSV() {
    setMsg("");
    const res = await supabase
      .from("tasks")
      .select("title,status,priority,due_date,pic_user_id,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (res.error) return setMsg(res.error.message);

    const rows = (res.data || []).map((t: any) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      pic: t.pic_user_id ? (userMap.get(t.pic_user_id) || t.pic_user_id) : "",
      created_at: t.created_at,
    }));

    downloadCSV(`tasks_${project?.name || id}.csv`, toCSV(rows));
  }

  async function exportPanjarCSV() {
    setMsg("");
    const res = await supabase
      .from("panjar")
      .select("amount,disburse_date,due_settlement,settled_at,receiver_user_id,note,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (res.error) return setMsg(res.error.message);

    const rows = (res.data || []).map((p: any) => ({
      amount: p.amount,
      disburse_date: p.disburse_date,
      due_settlement: p.due_settlement,
      status: p.settled_at ? "settled" : p.due_settlement && p.due_settlement < todayISO() ? "overdue" : "open",
      receiver: userMap.get(p.receiver_user_id) || p.receiver_user_id,
      note: p.note || "",
      created_at: p.created_at,
    }));

    downloadCSV(`panjar_${project?.name || id}.csv`, toCSV(rows));
  }

  if (!project) {
    return (
      <RequireAuth>
        <AppShell>
          <div className="text-sm text-gray-500">Loading project...</div>
          {msg && <div className="text-sm text-red-600 mt-2">{msg}</div>}
        </AppShell>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-gray-500">Project Detail</div>
            <h1 className="text-xl font-extrabold">{project.name}</h1>
            <div className="text-sm text-gray-500 mt-1">
              Status: <b>{project.status}</b> • End: <b>{project.end_date || "-"}</b>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {isLead && project.status !== "completed" && <Button onClick={markCompleted}>Mark Completed</Button>}
            <Button variant="ghost" className="border border-gray-200" onClick={exportTasksCSV}>Export Tasks CSV</Button>
            <Button variant="ghost" className="border border-gray-200" onClick={exportPanjarCSV}>Export Panjar CSV</Button>
            <TopActions />
          </div>
        </div>

        {msg && <div className="text-sm text-red-600 mt-3">{msg}</div>}

        <div className="mt-4">
          <Card>
            <CardHeader title="Project Members" hint="PM hanya bisa akses project yang dia jadi member." />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <span key={m.user_id} className="text-xs font-bold px-2 py-1 rounded-full border bg-gray-50">
                    {userMap.get(m.user_id) || m.user_id}
                  </span>
                ))}
              </div>

              {isLead && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                  <Select defaultValue="" onChange={(e) => addMember(e.target.value)}>
                    <option value="">+ Tambah member</option>
                    {profiles.filter((u) => !memberUserIds.has(u.id)).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} — {u.role}
                      </option>
                    ))}
                  </Select>
                  <div className="text-xs text-gray-500 flex items-center">
                    Tip: tambah Leo/Riswanto/Yulius/Fanio sesuai kebutuhan.
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Project Settings" hint="Update end_date & health di sini (Lead/Admin)." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-xs font-bold text-gray-600 mb-1">End Date</div>
                  <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} disabled={!isLead} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-600 mb-1">Health</div>
                  <Select value={editHealth} onChange={(e) => setEditHealth(e.target.value as any)} disabled={!isLead}>
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="off_track">Off Track</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={saveProjectMeta} disabled={!isLead} className="w-full">Save</Button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Mark Completed memicu due settlement panjar otomatis (end_date + 7).</div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Tasks (Project)" hint="Tambah task cepat + pagination." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <Input placeholder="Judul task" value={tTitle} onChange={(e) => setTTitle(e.target.value)} className="md:col-span-2" />
                <Select value={tPIC} onChange={(e) => setTPIC(e.target.value)}>
                  <option value="">PIC (optional)</option>
                  {profiles.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
                </Select>
                <Input type="date" value={tDue} onChange={(e) => setTDue(e.target.value)} />
                <Select value={tPriority} onChange={(e) => setTPriority(e.target.value as any)}>
                  <option value="p0">P0</option><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option>
                </Select>
                <Button onClick={addTask}>Add</Button>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <Select value={tStatus} onChange={(e) => setTStatus(e.target.value as any)}>
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </Select>
                <Button variant="ghost" className="border border-gray-200" onClick={() => loadTasks(Math.max(0, taskPage - 1))}>Prev</Button>
                <div className="text-xs text-gray-500">Page {taskPage + 1}</div>
                <Button variant="ghost" className="border border-gray-200" onClick={() => loadTasks(taskPage + 1)}>Next</Button>
              </div>

              <div className="mt-3 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-sm text-gray-500">Belum ada task.</div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="rounded-2xl border p-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold">{t.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          PIC: <b>{t.pic_user_id ? userMap.get(t.pic_user_id) || "-" : "-"}</b> • Priority: <b>{t.priority}</b>
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: <b>{t.due_date || "-"}</b> • Status: <b>{t.status}</b>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button variant="ghost" className="border border-gray-200" onClick={() => quickTaskStatus(t.id, "in_progress")}>Progress</Button>
                        <Button variant="ghost" className="border border-gray-200" onClick={() => quickTaskStatus(t.id, "blocked")}>Blocked</Button>
                        <Button onClick={() => quickTaskStatus(t.id, "done")}>Done</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Panjar (Project)" hint="Due settlement otomatis setelah Completed (end_date + 7)." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <Select value={pReceiver} onChange={(e) => setPReceiver(e.target.value)}>
                  <option value="">Receiver (PIC)</option>
                  {profiles.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
                </Select>
                <Input placeholder="Nominal (contoh 7500000)" value={pAmount} onChange={(e) => setPAmount(e.target.value)} />
                <Input type="date" value={pDisburse} onChange={(e) => setPDisburse(e.target.value)} />
                <Input placeholder="Catatan (optional)" value={pNote} onChange={(e) => setPNote(e.target.value)} className="md:col-span-2" />
                <Button onClick={addPanjarRow}>Add</Button>
              </div>

              <div className="mt-3 space-y-2">
                {panjar.length === 0 ? (
                  <div className="text-sm text-gray-500">Belum ada panjar.</div>
                ) : (
                  panjar.map((r) => (
                    <div key={r.id} className="rounded-2xl border p-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold">{formatIDR(Number(r.amount))}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Receiver: <b>{userMap.get(r.receiver_user_id) || "-"}</b> • Cair: <b>{r.disburse_date}</b>
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: <b>{r.due_settlement || "-"}</b> • {panjarStatus(r)}
                        </div>
                        {r.note && <div className="text-xs text-gray-500 mt-1">Note: {r.note}</div>}
                      </div>

                      {!r.settled_at ? <Button onClick={() => markSettled(r.id)}>Mark Settled</Button> : <span className="text-xs text-gray-500">—</span>}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
