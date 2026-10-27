import {createContext,useContext,useEffect,useState,useCallback} from 'react';import {useQueryClient} from '@tanstack/react-query';import {api,onUnauthorized} from './api';
const Ctx=createContext(null);export const useAuth=()=>useContext(Ctx);
export function AuthProvider({children}){
 const qc=useQueryClient(),[user,setUser]=useState(null),[perms,setPerms]=useState([]),[loading,setLoading]=useState(true);
 const clear=useCallback(()=>{setUser(null);setPerms([]);qc.clear()},[qc]); // qc.clear: data pengguna sebelumnya tidak boleh terlihat oleh pengguna berikutnya
 // Saat aplikasi dibuka: tanya server apakah sesi masih ada. Bila ya, pengguna langsung masuk tanpa login ulang.
 useEffect(()=>{let live=true;api('/auth/me').then(d=>{if(live&&d.user){setUser(d.user);setPerms(d.permissions)}}).catch(()=>{}).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);
 useEffect(()=>onUnauthorized(clear),[clear]);
 const login=async(email,password)=>{const d=await api('/auth/login',{method:'POST',body:{email,password}});qc.clear();setUser(d.user);setPerms(d.permissions)};
 const logout=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}clear()};
 return <Ctx.Provider value={{session:user?{user}:null,user,loading,can:p=>perms.includes(p),login,logout}}>{children}</Ctx.Provider>}
