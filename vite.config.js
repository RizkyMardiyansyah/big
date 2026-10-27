import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

// Port web dan target API dapat diubah lewat .env (WEB_PORT, PORT) tanpa mengedit file ini.
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const proxy={'/api':{target:`http://localhost:${env.PORT||4000}`,changeOrigin:true}};
  return {
    plugins:[react()],
    server:{
      host:'0.0.0.0',               // dapat diakses dari jaringan lokal
      port:Number(env.WEB_PORT||5174),
      strictPort:true,              // gagal jelas bila port terpakai, bukan pindah diam-diam
      allowedHosts:true,            // izinkan akses lewat IP/hostname lain saat dev (Vite >= 5.4.12)
      proxy,
    },
    preview:{host:'0.0.0.0',port:Number(env.WEB_PORT||5174),strictPort:true,allowedHosts:true,proxy}, // `npm run preview` juga meneruskan /api
  };
});
