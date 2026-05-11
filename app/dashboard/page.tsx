"use client";

import AppShell from '@/components/AppShell';
import RequireAuth from '@/components/RequireAuth';
import TopActions from '@/components/TopActions';
import { Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatIDR, todayISO } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

type Task = { id: string; title: string; due_date: string | null; status: string };
type Panjar = { id: string; amount: number; due_settlement: string | null; settled_at: string | null };

export default function Dashboard(){
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [panjarOverdue, setPanjarOverdue] = useState<Panjar[]>([]);
  const [projectsCount, setProjectsCount] = useState(0);
  const today = todayISO();

  useEffect(()=>{
    (async()=>{
      const p = await supabase.from('projects').select('id', { count: 'exact', head: true });
      setProjectsCount(p.count || 0);

      const t = await supabase.from('tasks').select('id,title,due_date,status')
        .lt('due_date', today).neq('status','done')
        .order('due_date',{ascending:true}).limit(10);
      setOverdueTasks((t.data||[]) as any);

      const pj = await supabase.from('panjar').select('id,amount,due_settlement,settled_at')
        .is('settled_at', null).not('due_settlement','is',null).lt('due_settlement', today)
        .order('due_settlement',{ascending:true}).limit(10);
      setPanjarOverdue((pj.data||[]) as any);
    })();
  }, [today]);

  const panjarSum = useMemo(()=> panjarOverdue.reduce((a,b)=>a+Number(b.amount||0),0), [panjarOverdue]);

  return (
    <RequireAuth>
      <AppShell>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Ringkas untuk action harian.</p>
          </div>
          <TopActions />
        </div>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardBody><div className="text-xs text-gray-500 font-bold">Total Projects</div><div className="text-2xl font-extrabold mt-1">{projectsCount}</div></CardBody></Card>
            <Card><CardBody><div className="text-xs text-gray-500 font-bold">Overdue Tasks</div><div className="text-2xl font-extrabold mt-1">{overdueTasks.length}</div></CardBody></Card>
            <Card><CardBody><div className="text-xs text-gray-500 font-bold">Panjar Overdue</div><div className="text-2xl font-extrabold mt-1">{formatIDR(panjarSum)}</div></CardBody></Card>
            <Card><CardBody><div className="text-xs text-gray-500 font-bold">Rule</div><div className="text-sm font-extrabold mt-2">Settlement H+7</div><div className="text-xs text-gray-500">set saat project completed</div></CardBody></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader title="Overdue Tasks (Top 10)" hint="Prioritas action." />
              <CardBody>
                {overdueTasks.length===0 ? <div className="text-sm text-gray-500">Aman.</div> : (
                  <ul className="space-y-2">
                    {overdueTasks.map(t=> (
                      <li key={t.id} className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold">{t.title}</div>
                        <Badge type="bad" text={`Due ${t.due_date}`} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Panjar Overdue (Top 10)" hint="Nominal & due." />
              <CardBody>
                {panjarOverdue.length===0 ? <div className="text-sm text-gray-500">Aman.</div> : (
                  <ul className="space-y-2">
                    {panjarOverdue.map(p=> (
                      <li key={p.id} className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold">{formatIDR(Number(p.amount))}</div>
                        <Badge type="bad" text={`Due ${p.due_settlement}`} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
