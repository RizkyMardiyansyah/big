import {useQuery} from '@tanstack/react-query';
const base=import.meta.env.VITE_API_URL||'/api';
// Login memakai session (cookie httpOnly dari server); token tidak lagi disimpan di localStorage.
const UNAUTH='big:unauthorized';
export const onUnauthorized=fn=>{window.addEventListener(UNAUTH,fn);return()=>window.removeEventListener(UNAUTH,fn)};
export async function api(path,{method='GET',body,form}={}){
 const h={};let b;
 if(form)b=form;else if(body!==undefined){h['Content-Type']='application/json';b=JSON.stringify(body)}
 const r=await fetch(base+path,{method,headers:h,body:b,credentials:'include'});
 const d=await r.json().catch(()=>null);
 // Sesi berakhir saat aplikasi dipakai: beri tahu AuthProvider agar pengguna diarahkan ke halaman login
 if(r.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event(UNAUTH));
 if(!r.ok)throw new Error(d?.error||`Something went wrong (${r.status})`);return d}
export const useGet=(path,o={})=>useQuery({queryKey:[path],queryFn:()=>api(path),...o});
const get=path=>fetch(base+path,{credentials:'include'});
export async function openFile(path){const r=await get(path);if(!r.ok)return alert('The file could not be opened');window.open(URL.createObjectURL(await r.blob()),'_blank','noopener')}
export async function downloadFile(path,name){const r=await get(path);if(!r.ok)return alert('The file could not be downloaded');const u=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
export async function fetchBlobUrl(path){const r=await get(path);return r.ok?URL.createObjectURL(await r.blob()):null}
