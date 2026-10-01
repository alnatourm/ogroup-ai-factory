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
 const ledger=await sql`select count(*)::int as count from schema_migrations`;
 if(Number(ledger[0]?.count??0)===0){
  const legacy=await sql`select to_regclass('public.organizations') as organizations,to_regclass('public.factory_runs') as factory_runs,to_regclass('public.factory_byok_vault') as byok`;
  if(legacy[0]?.organizations&&legacy[0]?.factory_runs){
   for(const name of files){
    const body=await readFile(resolve(migrationsDir,name),'utf8');
    const createsCore=/create\s+table\s+(organizations|users|memberships|sessions|factory_runs)\b/i.test(body);
    if(createsCore) await sql.unsafe('insert into schema_migrations(name) values($1) on conflict do nothing',[name]);
   }
   console.log(JSON.stringify({type:'LEGACY_SCHEMA_BASELINED'}));
  }
 }
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
