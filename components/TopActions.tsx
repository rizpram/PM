"use client";

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

export default function TopActions(){
  async function logout(){
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
  return (
    <Button variant="ghost" onClick={logout} className="border border-gray-200">Logout</Button>
  );
}
