"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Card, CardBody, CardHeader, Input } from '@/components/ui';

export default function Login(){
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  async function submit(){
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if(error) setErr(error.message);
    else window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader title="Login" hint="Akses PM Tracker (Projects • Tasks • Panjar)" />
          <CardBody>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Email</div>
                <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Password</div>
                <Input type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="••••••••" />
              </div>
              <Button onClick={submit} className="w-full">Masuk</Button>
              {err && <div className="text-sm text-red-600">{err}</div>}
              <div className="text-xs text-gray-500">Admin buatkan akun: Rizpram (Lead), Leo, Riswanto, Yulius, Fanio.</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
