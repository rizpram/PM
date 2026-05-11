"use client";

import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import TopActions from "@/components/TopActions";
import { Badge, Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { PAGE_SIZE, todayISO } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type Profile = { id: string; full_name: string; role: string };
type Project = { id: string; name: string };
type Task = {
  id: string;
  project_id: string;
  title: string;
  pic_user_id: string | null;
  due_date: string | null;
  priority: "p0" | "p1" | "p2" | "p3";
  status: "backlog" | "ready" | "in_progress" | "blocked" | "done";
};

export default function TasksPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<Task[]>([]);
  const [msg, setMsg] = useState("");

  const [page, setPage] = useState(0);

  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | Task["status"]>("all");
  const [filterPIC, setFilterPIC] = useState("");
  const [search, setSearch] = useState("");

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [picId, setPicId] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("p2");
  const [status, setStatus] = useState<Task["status"]>("backlog");

  const today = todayISO();

  async function boot() {
    const u = await supabase.from("profiles").select("id,full_name,role").order("full_name", { ascending: true });
    const p = await supabase.from("projects").select("id,name").order("created_at", { ascending: false });
    setProfiles((u.data || []) as any);
    setProjects((p.data || []) as any);
    await loadPage(0);
  }

  useEffect(() => { boot(); }, []);

  const userMap = useMemo(() => new Map(profiles.map((x) => [x.id, x.full_name])), [profiles]);
  const projectMap = useMemo(() => new Map(projects.map((x) => [x.id, x.name])), [projects]);

  async function loadPage(p: number) {
    setMsg("");

    let q = supabase
      .from("tasks")
      .select("id,project_id,title,pic_user_id,due_date,priority,status")
      .order("created_at", { ascending: false });

    if (filterProject) q = q.eq("project_id", filterProject);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    if (filterPIC) q = q.eq("pic_user_id", filterPIC);

    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const res = await q.range(from, to);

    if (res.error) setMsg(res.error.message);
    setRows((res.data || []) as any);
    setPage(p);
  }

  const view = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(s));
  }, [rows, search]);

  async function addTask() {
    setMsg("");
    if (!projectId) return setMsg("Project wajib dipilih.");
    if (!title.trim()) return setMsg("Judul task wajib.");

    const ins = await supabase.from("tasks").insert({
      project_id: projectId,
      title: title.trim(),
      pic_user_id: picId || null,
      due_date: due || null,
      priority,
      status,
    });

    if (ins.error) return setMsg(ins.error.message);

    setTitle("");
    setPicId("");
    setDue("");
    setPriority("p2");
    setStatus("backlog");
    await loadPage(0);
  }

  async function quickStatus(id: string, next: Task["status"]) {
    const up = await supabase.from("tasks").update({ status: next }).eq("id", id);
    if (up.error) setMsg(up.error.message);
    else await loadPage(page);
  }

  function dueBadge(dueDate: string | null, st: Task["status"]) {
    if (!dueDate) return <span className="text-xs text-gray-500">—</span>;
    const overdue = dueDate < today && st !== "done";
    return overdue ? <Badge type="bad" text={`Due ${dueDate}`} /> : <Badge type="warn" text={`Due ${dueDate}`} />;
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold">Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">Pagination ringan + quick update status.</p>
          </div>
          <TopActions />
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Add Task" hint="Form cepat." />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Pilih Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>

                <Input placeholder="Judul task" value={title} onChange={(e) => setTitle(e.target.value)} />

                <Select value={picId} onChange={(e) => setPicId(e.target.value)}>
                  <option value="">PIC (optional)</option>
                  {profiles.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </Select>

                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                <Button onClick={addTask}>Save</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="p0">P0</option><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option>
                </Select>
                <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </Select>
                <div className="text-xs text-gray-500 flex items-center">Tip: status bisa diubah cepat dari list.</div>
              </div>

              {msg && <div className="text-sm text-red-600 mt-3">{msg}</div>}
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </Select>
          <Select value={filterPIC} onChange={(e) => setFilterPIC(e.target.value)}>
            <option value="">All PIC</option>
            {profiles.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
          </Select>

          <Button variant="ghost" onClick={() => loadPage(0)} className="border border-gray-200">Apply</Button>

          <div className="ml-auto flex gap-2 items-center">
            <Button variant="ghost" onClick={() => loadPage(Math.max(0, page - 1))} className="border border-gray-200">Prev</Button>
            <div className="text-xs text-gray-500">Page {page + 1}</div>
            <Button variant="ghost" onClick={() => loadPage(page + 1)} className="border border-gray-200">Next</Button>
          </div>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader title="Task List" hint="Desktop table / mobile cards." />
            <CardBody>
              {view.length === 0 ? (
                <div className="text-sm text-gray-500">Tidak ada task.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-gray-500">
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2">Project</th>
                          <th className="text-left py-2 pr-2">Title</th>
                          <th className="text-left py-2 pr-2">PIC</th>
                          <th className="text-left py-2 pr-2">Due</th>
                          <th className="text-left py-2 pr-2">P</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Quick</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.map((t) => (
                          <tr key={t.id} className="border-b last:border-b-0">
                            <td className="py-3 pr-2">{projectMap.get(t.project_id) || "-"}</td>
                            <td className="py-3 pr-2">
                              <div className="font-extrabold">{t.title}</div>
                              <div className="text-xs text-gray-500">{t.id}</div>
                            </td>
                            <td className="py-3 pr-2">{t.pic_user_id ? userMap.get(t.pic_user_id) || "-" : "-"}</td>
                            <td className="py-3 pr-2">{dueBadge(t.due_date, t.status)}</td>
                            <td className="py-3 pr-2 font-extrabold">{t.priority}</td>
                            <td className="py-3 pr-2">{t.status}</td>
                            <td className="py-3 pr-2">
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="ghost" className="border border-gray-200" onClick={() => quickStatus(t.id, "in_progress")}>In Progress</Button>
                                <Button variant="ghost" className="border border-gray-200" onClick={() => quickStatus(t.id, "blocked")}>Blocked</Button>
                                <Button onClick={() => quickStatus(t.id, "done")}>Done</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {view.map((t) => (
                      <div key={t.id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">{projectMap.get(t.project_id) || "-"}</div>
                            <div className="font-extrabold mt-1">{t.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{t.id}</div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-xs font-extrabold">{t.priority}</div>
                            {dueBadge(t.due_date, t.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div className="text-gray-500">PIC</div>
                          <div className="font-semibold">{t.pic_user_id ? userMap.get(t.pic_user_id) || "-" : "-"}</div>
                          <div className="text-gray-500">Status</div>
                          <div className="font-semibold">{t.status}</div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Button variant="ghost" className="border border-gray-200" onClick={() => quickStatus(t.id, "in_progress")}>Progress</Button>
                          <Button variant="ghost" className="border border-gray-200" onClick={() => quickStatus(t.id, "blocked")}>Blocked</Button>
                          <Button onClick={() => quickStatus(t.id, "done")}>Done</Button>
                        </div>
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
