"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, todayISO } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/lib/useMe';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks', badgeKey: 'tasks' as const },
  { href: '/panjar', label: 'Panjar', badgeKey: 'panjar' as const },
];

function Pill({ n }: { n: number }){
  if(!n) return null;
  return (
    <span className="ml-2 inline-flex min-w-6 justify-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200">{n}</span>
  );
}

function NavItem({ href, label, badge }: { href: string; label: string; badge?: number }){
  const path = usePathname();
  const active = path === href || path.startsWith(href + '/');
  return (
    <Link href={href} className={cx('px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between',
      active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100')}
    >
      <span>{label}</span>
      {active ? null : <Pill n={badge || 0} />}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }){
  const { me } = useMe();
  const [badges, setBadges] = useState<{tasks:number; panjar:number}>({ tasks: 0, panjar: 0 });

  useEffect(() => {
    (async () => {
      const today = todayISO();
      const t = await supabase.from('tasks').select('id', { count: 'exact', head: true })
        .lt('due_date', today).neq('status', 'done');
      const p = await supabase.from('panjar').select('id', { count: 'exact', head: true })
        .is('settled_at', null).not('due_settlement', 'is', null).lt('due_settlement', today);
      setBadges({ tasks: t.count || 0, panjar: p.count || 0 });
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-900" />
            <div>
              <div className="text-sm font-extrabold leading-4">PM Tracker</div>
              <div className="text-xs text-gray-500">{me.name ? `${me.name} • ${me.role}` : 'Projects • Tasks • Panjar'}</div>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            {nav.map(n => (
              <NavItem key={n.href} href={n.href} label={n.label} badge={n.badgeKey ? (badges as any)[n.badgeKey] : 0} />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 md:grid md:grid-cols-[220px_1fr] md:gap-6">
        <aside className="hidden md:block pt-6">
          <div className="sticky top-[72px] space-y-2">
            {nav.map(n => (
              <NavItem key={n.href} href={n.href} label={n.label} badge={n.badgeKey ? (badges as any)[n.badgeKey] : 0} />
            ))}
            <div className="pt-4 text-xs text-gray-500">Badge = overdue • RLS membership aktif</div>
          </div>
        </aside>
        <main className="py-6">{children}</main>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-white">
        <div className="mx-auto max-w-6xl px-2 py-2 grid grid-cols-4 gap-1">
          {nav.map(n => (
            <NavItem key={n.href} href={n.href} label={n.label} badge={n.badgeKey ? (badges as any)[n.badgeKey] : 0} />
          ))}
        </div>
      </div>
      <div className="md:hidden h-16" />
    </div>
  );
}
