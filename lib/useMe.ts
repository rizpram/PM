"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useMe(){
  const [me, setMe] = useState<{id?:string; name?:string; role?:string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      const uid = sess.data.session?.user.id;
      if(!uid){ setLoading(false); return; }
      const prof = await supabase.from('profiles').select('id,full_name,role').eq('id', uid).single();
      setMe({ id: prof.data?.id, name: prof.data?.full_name, role: prof.data?.role });
      setLoading(false);
    })();
  }, []);

  return { me, loading };
}
