-- =======================================================================
-- MATEMÁTICAS ACTIVA · SERVIDOR (Supabase)
-- Pegá este archivo completo en Supabase → SQL Editor → Run.
-- Crea:
--   cursos    → cada curso con la clave del docente (guardada como huella)
--   progreso  → los intentos de los alumnos (los manda la calculadora)
--   codigos   → códigos de activación de la versión completa (huellas)
-- y las funciones que usa la calculadora:
--   validar_codigo(codigo)              → true/false (y cuenta el uso)
--   progreso_del_curso(curso, clave)    → los intentos del curso, solo con la clave del docente
-- Nadie puede leer las tablas directamente: solo a través de esas funciones.
-- =======================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cursos (
  id                  text primary key,                 -- código del curso, ej. '3B-2026'
  nombre              text not null,
  clave_docente_hash  text not null,                    -- sha256 de la clave del docente
  creado              timestamptz not null default now()
);

create table if not exists public.progreso (
  id             bigint generated always as identity primary key,
  curso_id       text references public.cursos(id) on delete cascade,
  alumno_codigo  text,
  alumno_nombre  text,
  area           text not null,
  tema           text,
  nombre_tema    text,
  ejercicio      text,
  correcto       boolean not null,
  practica       boolean not null default false,
  creado         timestamptz not null default now(),
  constraint progreso_largos check (
    char_length(coalesce(ejercicio, '')) <= 300 and char_length(coalesce(alumno_nombre, '')) <= 80 and
    char_length(coalesce(alumno_codigo, '')) <= 20 and char_length(area) <= 10)
);
create index if not exists progreso_curso_idx on public.progreso (curso_id, creado desc);

create table if not exists public.codigos (
  hash      text primary key,                           -- sha256 del código en MAYÚSCULAS
  activo    boolean not null default true,
  usos      int not null default 0,
  max_usos  int not null default 3,                     -- en cuántos dispositivos se puede activar
  creado    timestamptz not null default now()
);

-- Seguridad: con RLS activado y sin políticas de lectura, nadie lee las tablas desde la web.
alter table public.cursos   enable row level security;
alter table public.progreso enable row level security;
alter table public.codigos  enable row level security;

-- La calculadora solo puede AGREGAR intentos, y solo de cursos que existen.
drop policy if exists "la calculadora agrega intentos" on public.progreso;
create policy "la calculadora agrega intentos" on public.progreso
  for insert to anon
  with check (curso_id is not null and exists (select 1 from public.cursos c where c.id = curso_id));
grant insert on public.progreso to anon;

-- Valida un código de la versión completa (compara huellas y suma un uso).
create or replace function public.validar_codigo(codigo text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  update public.codigos set usos = usos + 1
   where hash = encode(digest(upper(trim(codigo)), 'sha256'), 'hex') and activo and usos < max_usos
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- Devuelve el progreso de un curso solo si la clave del docente es correcta.
create or replace function public.progreso_del_curso(curso text, clave text)
returns setof public.progreso language sql security definer set search_path = public, extensions as $$
  select p.* from public.progreso p
    join public.cursos c on c.id = p.curso_id
   where c.id = curso and c.clave_docente_hash = encode(digest(clave, 'sha256'), 'hex')
   order by p.creado desc limit 5000;
$$;

revoke all on function public.validar_codigo(text) from public;
revoke all on function public.progreso_del_curso(text, text) from public;
grant execute on function public.validar_codigo(text) to anon;
grant execute on function public.progreso_del_curso(text, text) to anon;

-- =======================================================================
-- EJEMPLOS (cambiá los valores y ejecutá solo estas líneas cuando las necesites)
-- =======================================================================
-- Crear un curso con la clave del docente:
--   insert into public.cursos (id, nombre, clave_docente_hash)
--   values ('3B-2026', '3.° B · 2026', encode(extensions.digest('MI-CLAVE-SECRETA', 'sha256'), 'hex'));
--
-- Cargar códigos de la versión completa (generalos con pruebas/codigos.html):
--   insert into public.codigos (hash) values (encode(extensions.digest('MATE-2026-ABCD', 'sha256'), 'hex'));
--
-- Desactivar un código:
--   update public.codigos set activo = false where hash = encode(extensions.digest('MATE-2026-ABCD', 'sha256'), 'hex');

-- =======================================================================
-- ESTADÍSTICAS DE USO ANÓNIMAS (js/estadisticas.js)
-- La calculadora solo puede AGREGAR eventos (sin datos personales).
-- El panel herramientas/estadisticas.html los lee con la clave del docente.
-- =======================================================================
create table if not exists public.eventos (
  id      bigint generated always as identity primary key,
  creado  timestamptz not null default now(),
  evento  text not null check (char_length(evento) <= 30),
  sesion  text check (char_length(sesion) <= 20),
  area    text check (char_length(area) <= 10),
  tema    text check (char_length(tema) <= 30),
  datos   jsonb check (pg_column_size(datos) <= 2000)
);
create index if not exists eventos_creado_idx on public.eventos (creado desc);
alter table public.eventos enable row level security;
drop policy if exists "la calculadora agrega eventos" on public.eventos;
create policy "la calculadora agrega eventos" on public.eventos for insert to anon with check (true);
grant insert on public.eventos to anon;

-- Clave para ver las estadísticas (guardada como huella). Cambiala con:
--   insert into public.ajustes (clave, valor) values ('clave_estadisticas', encode(extensions.digest('MI-CLAVE', 'sha256'), 'hex'))
--   on conflict (clave) do update set valor = excluded.valor;
create table if not exists public.ajustes (clave text primary key, valor text not null);
alter table public.ajustes enable row level security;

-- Devuelve los eventos de los últimos N días, solo con la clave correcta.
create or replace function public.eventos_recientes(clave text, dias int default 30)
returns setof public.eventos language sql security definer set search_path = public, extensions as $$
  select e.* from public.eventos e
   where exists (select 1 from public.ajustes a where a.clave = 'clave_estadisticas' and a.valor = encode(digest(eventos_recientes.clave, 'sha256'), 'hex'))
     and e.creado > now() - make_interval(days => least(greatest(dias, 1), 365))
   order by e.creado desc limit 50000;
$$;
revoke all on function public.eventos_recientes(text, int) from public;
grant execute on function public.eventos_recientes(text, int) to anon;

-- =======================================================================
-- ASISTENTE CON IA (función de borde servidor/asistente/index.ts)
-- Cuenta las consultas por día para poner un límite y cuidar el costo.
-- =======================================================================
create table if not exists public.uso_asistente (
  dia     date not null default current_date,
  quien   text not null,                 -- huella de la IP (no la IP)
  usos    int  not null default 0,
  primary key (dia, quien)
);
alter table public.uso_asistente enable row level security;   -- solo la función de borde (con su clave de servicio) la usa
create or replace function public.sumar_uso_asistente(p_quien text, p_limite int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.uso_asistente (dia, quien, usos) values (current_date, p_quien, 1)
  on conflict (dia, quien) do update set usos = public.uso_asistente.usos + 1
  returning usos into n;
  return n <= p_limite;
end $$;
revoke all on function public.sumar_uso_asistente(text, int) from public, anon, authenticated;
