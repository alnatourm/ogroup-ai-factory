import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';

const databaseUrl=process.env.DATABASE_URL?.trim();
if(!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
const sql=postgres(databaseUrl,{max:1});
const migrationsDir=resolve(process.cwd(),'../../packages/database/migrations');

try{
 await sql.unsafe('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
 const files=(await readdir(migrationsDir)).filter(name=>name.endsWith('.sql')).sort();
 for(const name of files){
  const applied=await sql`select 1 from schema_migrations where name=${name} limit 1`;
  if(applied[0])continue;
  const body=await readFile(resolve(migrationsDir,name),'utf8');
  await sql.begin(async tx=>{
   await tx.unsafe(body);
   await tx.unsafe('insert into schema_migrations(name) values($1)',[name]);
  });
  console.log(JSON.stringify({type:'MIGRATION_APPLIED',name}));
 }
 console.log(JSON.stringify({type:'MIGRATIONS_READY',count:files.length}));
} finally { await sql.end(); }
