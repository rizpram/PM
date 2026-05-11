"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequireAuth({ children }: { children: React.ReactNode }){
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if(!data.session){ window.location.href = '/login'; return; }
      setOk(true);
    })();
  }, []);

  if(!ok) return <div className="text-sm text-gray-500">Loading...</div>;
  return <>{children}</>;
}
