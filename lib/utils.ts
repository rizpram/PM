export const PAGE_SIZE = 15;

export function todayISO(){
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,'0');
  const d = String(dt.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export function formatIDR(n: number){
  return 'Rp ' + (n||0).toLocaleString('id-ID');
}

export function cx(...a: Array<string|false|undefined>){
  return a.filter(Boolean).join(' ');
}
