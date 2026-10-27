import 'dotenv/config';import knex from 'knex';import {fileURLToPath} from 'url';
const e=process.env,client=e.DB_CLIENT||'mssql';
let connection;
if(client==='sqlite3'||client==='better-sqlite3')connection={filename:e.DB_FILE||'./big.sqlite'};
else if(e.DB_URL)connection=e.DB_URL;
else if(client==='mssql')connection={server:e.DB_HOST||'localhost',port:Number(e.DB_PORT||1433),user:e.DB_USER,password:e.DB_PASSWORD,database:e.DB_NAME,options:{encrypt:e.DB_ENCRYPT==='true',trustServerCertificate:e.DB_TRUST_CERT!=='false'}};
else connection={host:e.DB_HOST||'localhost',port:e.DB_PORT?Number(e.DB_PORT):undefined,user:e.DB_USER,password:e.DB_PASSWORD,database:e.DB_NAME};
export const db=knex({client,connection,useNullAsDefault:true,pool:{min:0,max:10}});
export const migrationsDir=fileURLToPath(new URL('./migrations',import.meta.url));
