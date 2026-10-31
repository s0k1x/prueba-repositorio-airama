-- Airama Propiedades · red multiagencia
-- Agencias colaboradoras publican sus inmuebles (manualmente o por feed XML Kyero)
-- y los compartidos aparecen en la web de Airama. Las solicitudes se enrutan a la
-- agencia que comercializa el inmueble.

create schema if not exists private;

-- Agencias de la red (Airama es la propietaria del portal)
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 120),
  is_owner boolean not null default false,
  logo_url text,
  phone text,
  email text,
  website text,
  city text,
  feed_url text,
  feed_format text not null default 'kyero' check (feed_format in ('kyero','manual')),
  commission_share numeric(5,2) default 50 check (commission_share between 0 and 100),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index agencies_one_owner on public.agencies (is_owner) where is_owner;

-- Usuarios de cada agencia (acceso al panel)
create table public.agency_members (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agente' check (role in ('admin','agente')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);
create index agency_members_user_idx on public.agency_members(user_id);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  avg_price_m2 integer,
  image_url text,
  scene text default 'city',
  sort smallint not null default 0
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  ref text not null unique,
  external_id text,
  operation text not null check (operation in ('venta','alquiler')),
  type text not null check (type in ('Villa','Ático','Piso','Finca','Casa','Dúplex','Local','Terreno')),
  title text not null,
  description text,
  zone text not null,
  city text,
  price numeric(14,2) not null check (price > 0),
  built_m2 integer check (built_m2 > 0),
  plot_m2 integer,
  terrace_m2 integer,
  bedrooms smallint not null default 0,
  bathrooms smallint not null default 0,
  energy_rating text check (energy_rating in ('A','B','C','D','E','F','G','En trámite')),
  badge text,
  featured boolean not null default false,
  shared boolean not null default true,       -- visible en la red (colaboración)
  status text not null default 'publicada' check (status in ('borrador','publicada','reservada','vendida','alquilada')),
  scene text default 'sea',                  -- ilustración de reserva si no hay foto
  lat double precision,
  lng double precision,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, external_id)
);
create index properties_agency_idx on public.properties(agency_id);
create index properties_search_idx on public.properties(status, operation, zone, price);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  alt text,
  position smallint not null default 0
);
create index property_images_prop_idx on public.property_images(property_id, position);

-- Solicitudes de contacto
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  apellidos text check (char_length(apellidos) <= 120),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and char_length(email) <= 200),
  telefono text check (char_length(telefono) <= 40),
  interes text not null check (interes in ('Comprar','Vender','Alquilar','Valorar')),
  zona text check (char_length(zona) <= 60),
  referencia text check (char_length(referencia) <= 30),
  mensaje text check (char_length(mensaje) <= 3000),
  consent boolean not null check (consent),
  property_id uuid references public.properties(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  status text not null default 'nuevo' check (status in ('nuevo','contactado','visita','cerrado','descartado'))
);
create index leads_agency_idx on public.leads(agency_id, created_at desc);
create index leads_property_idx on public.leads(property_id);

create table public.feed_imports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  upserted integer default 0,
  unpublished integer default 0,
  error text
);
create index feed_imports_agency_idx on public.feed_imports(agency_id, started_at desc);

-- Funciones auxiliares (esquema privado, no expuesto por la API REST)
create or replace function private.is_member(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agency_members m
                 where m.agency_id = a and m.user_id = (select auth.uid()));
$$;
create or replace function private.is_owner_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agency_members m
                 join public.agencies ag on ag.id = m.agency_id
                 where ag.is_owner and m.role = 'admin' and m.user_id = (select auth.uid()));
$$;
create or replace function private.property_visible(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties pr join public.agencies a on a.id = pr.agency_id
                 where pr.id = p and a.active and pr.status in ('publicada','reservada')
                   and (pr.shared or a.is_owner));
$$;
grant usage on schema private to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger properties_touch before update on public.properties
  for each row execute function private.touch_updated_at();

-- Referencia automática AIR-0001… si no se indica
create sequence if not exists public.property_ref_seq start 2500;
create or replace function private.default_ref()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'AIR-' || nextval('public.property_ref_seq');
  end if;
  return new;
end; $$;
create trigger properties_ref before insert on public.properties
  for each row execute function private.default_ref();

-- Una solicitud sobre un inmueble va a la agencia que lo comercializa; si no, a Airama.
create or replace function private.route_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.property_id is null and coalesce(new.referencia, '') <> '' then
    select p.id into new.property_id from public.properties p
    where upper(p.ref) = upper(trim(new.referencia));
  end if;
  new.agency_id := null;
  if new.property_id is not null then
    select p.agency_id into new.agency_id from public.properties p where p.id = new.property_id;
  end if;
  if new.agency_id is null then
    select a.id into new.agency_id from public.agencies a where a.is_owner;
  end if;
  new.status := 'nuevo';
  new.created_at := now();
  return new;
end; $$;
create trigger leads_route before insert on public.leads
  for each row execute function private.route_lead();

-- ---------------------------------------------------------------- RLS
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.zones enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.leads enable row level security;
alter table public.feed_imports enable row level security;

-- agencias
create policy agencies_select on public.agencies for select
  using (active or (select private.is_member(id)) or (select private.is_owner_admin()));
create policy agencies_insert on public.agencies for insert to authenticated
  with check ((select private.is_owner_admin()));
create policy agencies_update on public.agencies for update to authenticated
  using ((select private.is_owner_admin()) or (select private.is_member(id)))
  with check ((select private.is_owner_admin()) or ((select private.is_member(id)) and not is_owner));
create policy agencies_delete on public.agencies for delete to authenticated
  using ((select private.is_owner_admin()));

-- miembros
create policy members_select on public.agency_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_owner_admin()));
create policy members_insert on public.agency_members for insert to authenticated
  with check ((select private.is_owner_admin()));
create policy members_update on public.agency_members for update to authenticated
  using ((select private.is_owner_admin())) with check ((select private.is_owner_admin()));
create policy members_delete on public.agency_members for delete to authenticated
  using ((select private.is_owner_admin()));

-- zonas
create policy zones_select on public.zones for select using (true);
create policy zones_insert on public.zones for insert to authenticated with check ((select private.is_owner_admin()));
create policy zones_update on public.zones for update to authenticated
  using ((select private.is_owner_admin())) with check ((select private.is_owner_admin()));
create policy zones_delete on public.zones for delete to authenticated using ((select private.is_owner_admin()));

-- inmuebles: el público ve los publicados de la red; cada agencia gestiona los suyos
create policy properties_select on public.properties for select
  using ((select private.property_visible(id)) or (select private.is_member(agency_id)) or (select private.is_owner_admin()));
create policy properties_insert on public.properties for insert to authenticated
  with check ((select private.is_member(agency_id)) or (select private.is_owner_admin()));
create policy properties_update on public.properties for update to authenticated
  using ((select private.is_member(agency_id)) or (select private.is_owner_admin()))
  with check ((select private.is_member(agency_id)) or (select private.is_owner_admin()));
create policy properties_delete on public.properties for delete to authenticated
  using ((select private.is_member(agency_id)) or (select private.is_owner_admin()));

-- fotos
create policy images_select on public.property_images for select
  using ((select private.property_visible(property_id))
         or exists (select 1 from public.properties p where p.id = property_id
                    and ((select private.is_member(p.agency_id)) or (select private.is_owner_admin()))));
create policy images_write on public.property_images for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = property_id
                      and ((select private.is_member(p.agency_id)) or (select private.is_owner_admin()))));
create policy images_update on public.property_images for update to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id
                 and ((select private.is_member(p.agency_id)) or (select private.is_owner_admin()))));
create policy images_delete on public.property_images for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id
                 and ((select private.is_member(p.agency_id)) or (select private.is_owner_admin()))));

-- solicitudes: cualquiera puede enviar una; solo la agencia destinataria (o Airama) las lee
create policy leads_insert on public.leads for insert to anon, authenticated
  with check (consent);
create policy leads_select on public.leads for select to authenticated
  using ((select private.is_member(agency_id)) or (select private.is_owner_admin()));
create policy leads_update on public.leads for update to authenticated
  using ((select private.is_member(agency_id)) or (select private.is_owner_admin()))
  with check ((select private.is_member(agency_id)) or (select private.is_owner_admin()));

-- historial de importaciones
create policy imports_select on public.feed_imports for select to authenticated
  using ((select private.is_member(agency_id)) or (select private.is_owner_admin()));

-- Vista pública con la agencia que comercializa cada inmueble
create view public.network_properties with (security_invoker = true) as
  select p.id, p.ref, p.operation, p.type, p.title, p.description, p.zone, p.city, p.price,
         p.built_m2, p.plot_m2, p.terrace_m2, p.bedrooms, p.bathrooms, p.energy_rating,
         p.badge, p.featured, p.status, p.scene, p.published_at,
         a.id as agency_id, a.name as agency_name, a.slug as agency_slug, a.is_owner as own_listing,
         (select coalesce(json_agg(json_build_object('url', i.url, 'alt', i.alt) order by i.position), '[]'::json)
            from public.property_images i where i.property_id = p.id) as images
  from public.properties p join public.agencies a on a.id = p.agency_id
  where (select private.property_visible(p.id));
grant select on public.network_properties to anon, authenticated;
