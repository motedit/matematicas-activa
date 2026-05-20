-- ================================================================
--  MATEMÁTICAS ACTIVA — Esquema Supabase
--  Ejecutá este SQL una sola vez en el SQL Editor de Supabase
--  (Dashboard → SQL Editor → New query → pegar todo → RUN)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABLA PERFILES (extiende auth.users con datos del dominio)
-- ----------------------------------------------------------------
create table if not exists public.perfiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    username        text unique not null,
    rol             text not null default 'usuario' check (rol in ('usuario','admin')),
    premium_hasta   timestamptz,
    vistos          text[] not null default '{}',          -- ids de archivos vistos en cuota gratis
    creado_en       timestamptz not null default now(),
    ultimo_login    timestamptz
);

-- Índice para búsqueda rápida por username
create index if not exists idx_perfiles_username on public.perfiles(username);

-- ----------------------------------------------------------------
-- 2. TABLA ARCHIVOS (metadata de videos, PDFs, premium, etc.)
-- ----------------------------------------------------------------
create table if not exists public.archivos (
    id              uuid primary key default gen_random_uuid(),
    titulo          text not null,
    descripcion     text default '',
    materia         text not null,
    seccion         text not null check (seccion in ('video','pdf','premium','imagen','texto')),
    tipo            text not null check (tipo in ('archivo','texto','url-video')),
    storage_path    text,                                  -- ruta dentro del bucket 'archivos'
    nombre_archivo  text,
    mime_type       text,
    tamano_bytes    bigint,
    url_video       text,                                  -- para tipo url-video (YouTube, Vimeo)
    contenido_texto text,                                  -- para tipo texto
    miniatura       text,                                  -- base64 jpeg (thumbnail imágenes)
    creado_por      uuid references auth.users(id) on delete set null,
    creado_en       timestamptz not null default now()
);

create index if not exists idx_archivos_materia  on public.archivos(materia);
create index if not exists idx_archivos_seccion  on public.archivos(seccion);
create index if not exists idx_archivos_creado   on public.archivos(creado_en desc);

-- ----------------------------------------------------------------
-- 3. TABLA HISTORIAL DE PAGOS
-- ----------------------------------------------------------------
create table if not exists public.historial_pagos (
    id              uuid primary key default gen_random_uuid(),
    usuario_id      uuid not null references auth.users(id) on delete cascade,
    monto           text not null,
    moneda          text not null default 'ARS',
    dias_activados  int  not null default 30,
    tipo            text not null check (tipo in ('activacion','renovacion')),
    creado_en       timestamptz not null default now()
);

create index if not exists idx_pagos_usuario on public.historial_pagos(usuario_id);

-- ----------------------------------------------------------------
-- 4. TRIGGER: crear perfil automáticamente al registrarse
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.perfiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------
-- 5. FUNCIÓN HELPER: ¿el usuario actual es admin?
-- ----------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
    select exists (
        select 1 from public.perfiles
        where id = auth.uid() and rol = 'admin'
    );
$$;

-- ----------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - HABILITAR
-- ----------------------------------------------------------------
alter table public.perfiles         enable row level security;
alter table public.archivos         enable row level security;
alter table public.historial_pagos  enable row level security;

-- ----------------------------------------------------------------
-- 7. POLÍTICAS RLS — PERFILES
-- ----------------------------------------------------------------
drop policy if exists "perfiles_select_propios"      on public.perfiles;
drop policy if exists "perfiles_select_admin"        on public.perfiles;
drop policy if exists "perfiles_update_propio"       on public.perfiles;
drop policy if exists "perfiles_update_admin"        on public.perfiles;
drop policy if exists "perfiles_delete_admin"        on public.perfiles;

-- SELECT: cada usuario ve su propio perfil; admin ve todos
create policy "perfiles_select_propios" on public.perfiles
    for select using (auth.uid() = id);

create policy "perfiles_select_admin" on public.perfiles
    for select using (public.es_admin());

-- UPDATE: el usuario puede actualizar su propio username y vistos; admin puede todo
create policy "perfiles_update_propio" on public.perfiles
    for update using (auth.uid() = id)
    with check (
        auth.uid() = id
        and rol = (select rol from public.perfiles where id = auth.uid())
        and (premium_hasta is null or premium_hasta = (select premium_hasta from public.perfiles where id = auth.uid()))
    );

create policy "perfiles_update_admin" on public.perfiles
    for update using (public.es_admin());

-- DELETE: solo admin
create policy "perfiles_delete_admin" on public.perfiles
    for delete using (public.es_admin());

-- ----------------------------------------------------------------
-- 8. POLÍTICAS RLS — ARCHIVOS
-- ----------------------------------------------------------------
drop policy if exists "archivos_select_todos"   on public.archivos;
drop policy if exists "archivos_insert_admin"   on public.archivos;
drop policy if exists "archivos_update_admin"   on public.archivos;
drop policy if exists "archivos_delete_admin"   on public.archivos;

-- SELECT: cualquiera autenticado ve la metadata (el gating premium se hace en cliente)
create policy "archivos_select_todos" on public.archivos
    for select using (auth.role() = 'authenticated');

-- INSERT / UPDATE / DELETE: solo admin
create policy "archivos_insert_admin" on public.archivos
    for insert with check (public.es_admin());

create policy "archivos_update_admin" on public.archivos
    for update using (public.es_admin());

create policy "archivos_delete_admin" on public.archivos
    for delete using (public.es_admin());

-- ----------------------------------------------------------------
-- 9. POLÍTICAS RLS — HISTORIAL PAGOS
-- ----------------------------------------------------------------
drop policy if exists "pagos_select_propio" on public.historial_pagos;
drop policy if exists "pagos_select_admin"  on public.historial_pagos;
drop policy if exists "pagos_insert_admin"  on public.historial_pagos;

create policy "pagos_select_propio" on public.historial_pagos
    for select using (auth.uid() = usuario_id);

create policy "pagos_select_admin" on public.historial_pagos
    for select using (public.es_admin());

create policy "pagos_insert_admin" on public.historial_pagos
    for insert with check (public.es_admin());

-- ----------------------------------------------------------------
-- 10. STORAGE BUCKET 'archivos' (privado, solo authenticated)
-- ----------------------------------------------------------------
-- IMPORTANTE: este bucket lo creás MANUAL desde Dashboard → Storage → New bucket
--   Name: archivos
--   Public bucket: OFF (privado)
--   File size limit: 50 MB (free tier de Supabase)
-- Luego ejecutá las políticas de abajo.

-- Políticas del bucket (se aplican sobre storage.objects)
drop policy if exists "storage_select_authenticated"  on storage.objects;
drop policy if exists "storage_insert_admin"          on storage.objects;
drop policy if exists "storage_update_admin"          on storage.objects;
drop policy if exists "storage_delete_admin"          on storage.objects;

create policy "storage_select_authenticated" on storage.objects
    for select using (
        bucket_id = 'archivos'
        and auth.role() = 'authenticated'
    );

create policy "storage_insert_admin" on storage.objects
    for insert with check (
        bucket_id = 'archivos'
        and public.es_admin()
    );

create policy "storage_update_admin" on storage.objects
    for update using (
        bucket_id = 'archivos'
        and public.es_admin()
    );

create policy "storage_delete_admin" on storage.objects
    for delete using (
        bucket_id = 'archivos'
        and public.es_admin()
    );

-- ----------------------------------------------------------------
-- 11. PROMOVER UN USUARIO A ADMIN
-- ----------------------------------------------------------------
-- Después de registrarte por primera vez con tu email/contraseña en la web,
-- vení acá, reemplazá 'tu-email@ejemplo.com' por tu email real, y ejecutá:
--
--   update public.perfiles
--   set rol = 'admin'
--   where id = (select id from auth.users where email = 'tu-email@ejemplo.com');
--
-- A partir de ese momento ese usuario tiene permisos de admin.
-- ================================================================
