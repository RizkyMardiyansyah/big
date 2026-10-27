import bcrypt from 'bcryptjs';import {randomBytes} from 'crypto';import {db} from '../db.js';import {uid} from '../lib.js';
// Pakai: ADMIN_PASSWORD=... npm run create-admin -- email@perusahaan.com "Nama Lengkap"   (tanpa ADMIN_PASSWORD, dibuatkan acak dan dicetak sekali)
const [email,name='Administrator']=process.argv.slice(2);if(!email){console.error('Email is required.');process.exit(1)}
const sa=await db('roles').where({name:'Super Admin'}).first();if(!sa){console.error('Run npm run db:seed first.');process.exit(1)}
if(await db('users').whereRaw('lower(email)=?',[email.toLowerCase()]).first()){console.error('This email is already registered.');process.exit(1)}
const pw=process.env.ADMIN_PASSWORD||randomBytes(9).toString('base64url');if(pw.length<8){console.error('Password must be at least 8 characters.');process.exit(1)}
const id=uid();await db.transaction(async t=>{await t('users').insert({id,email:email.toLowerCase(),full_name:name,password_hash:await bcrypt.hash(pw,10),active:true,created_at:new Date()});await t('user_roles').insert({user_id:id,role_id:sa.id})});
console.log(`Admin created: ${email}`+(process.env.ADMIN_PASSWORD?'':`\nTemporary password (save it, it will not be shown again): ${pw}`));await db.destroy();
