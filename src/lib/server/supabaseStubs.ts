/**
 * Stand-ins for the parts of Supabase our SQL expects (the `auth` and
 * `storage` schemas, the anon / authenticated roles). With these, the REAL
 * supabase/schema.sql runs in PGlite — a small Postgres that lives inside
 * Node — for the SQL tests and for the local sandbox (lib/server/sandbox.ts).
 */
export const SUPABASE_STUBS = `
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, metadata jsonb, created_at timestamptz default now());
  alter table storage.objects enable row level security;
  create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
`;
