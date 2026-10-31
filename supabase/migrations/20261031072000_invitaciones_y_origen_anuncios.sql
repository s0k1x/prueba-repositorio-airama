-- Invitaciones al panel + origen de los anuncios (propio, agencia o API de idealista)

create table public.agency_invites (
  email text not null,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  role text not null default 'agente' check (role in ('admin','agente')),
  created_at timestamptz not null default now(),
  primary key (email, agency_id)
);
alter table public.agency_invites enable row level security;
create policy invites_select on public.agency_invites for select to authenticated
  using ((select private.is_owner_admin()));
grant select on public.agency_invites to authenticated;
grant all on public.agency_invites to service_role;

create or replace function private.is_agency_admin(a uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agency_members m
                 where m.agency_id = a and m.role = 'admin' and m.user_id = (select auth.uid()));
$$;
grant execute on function private.is_agency_admin(uuid) to authenticated;

create or replace function public.invite_member(p_email text, p_agency uuid, p_role text default 'agente')
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid; e text := lower(trim(p_email));
begin
  if not (private.is_owner_admin() or private.is_agency_admin(p_agency)) then
    raise exception 'Solo un administrador puede invitar a esta agencia';
  end if;
  if p_role not in ('admin','agente') then raise exception 'Rol no válido'; end if;
  select id into uid from auth.users where lower(email) = e;
  if uid is not null then
    insert into public.agency_members (agency_id, user_id, role) values (p_agency, uid, p_role)
    on conflict (agency_id, user_id) do update set role = excluded.role;
    return 'vinculado';
  end if;
  insert into public.agency_invites (email, agency_id, role) values (e, p_agency, p_role)
  on conflict (email, agency_id) do update set role = excluded.role;
  return 'invitado';
end; $$;
revoke all on function public.invite_member(text, uuid, text) from public, anon;
grant execute on function public.invite_member(text, uuid, text) to authenticated;

create or replace function private.claim_invites()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_members (agency_id, user_id, role)
  select i.agency_id, new.id, i.role from public.agency_invites i where i.email = lower(new.email)
  on conflict do nothing;
  delete from public.agency_invites where email = lower(new.email);
  return new;
end; $$;
create trigger on_auth_user_created_claim after insert on auth.users
  for each row execute function private.claim_invites();

-- Origen de cada anuncio
alter table public.properties
  add column source text not null default 'propia' check (source in ('propia','agencia','idealista')),
  add column source_url text,
  add column agency_display text;
update public.properties p set source = case when a.is_owner then 'propia' else 'agencia' end
  from public.agencies a where a.id = p.agency_id;

alter table public.agencies drop constraint agencies_feed_format_check;
alter table public.agencies add constraint agencies_feed_format_check
  check (feed_format in ('kyero','manual','idealista_api'));

insert into public.agencies (slug, name, is_owner, feed_format, commission_share, is_demo)
values ('idealista', 'idealista', false, 'idealista_api', 0, false)
on conflict (slug) do nothing;

-- Búsquedas que se traen de la API oficial de idealista (zona = centro + radio)
create table public.idealista_searches (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  operation text not null check (operation in ('sale','rent')),
  property_type text not null default 'homes' check (property_type in ('homes','offices','premises','garages','bedrooms')),
  center_lat double precision not null,
  center_lng double precision not null,
  distance_m integer not null default 5000 check (distance_m between 100 and 50000),
  min_price integer,
  max_pages smallint not null default 2 check (max_pages between 1 and 20),
  active boolean not null default true,
  last_run timestamptz
);
alter table public.idealista_searches enable row level security;
create policy idealista_searches_admin on public.idealista_searches for all to authenticated
  using ((select private.is_owner_admin())) with check ((select private.is_owner_admin()));
grant select, insert, update, delete on public.idealista_searches to authenticated;
grant all on public.idealista_searches to service_role;

insert into public.idealista_searches (zone, operation, center_lat, center_lng, distance_m, min_price) values
  ('Madrid', 'sale', 40.4300, -3.6840, 4000, 900000),
  ('Marbella', 'sale', 36.5100, -4.8830, 8000, 900000),
  ('Mallorca', 'sale', 39.5700, 2.6500, 25000, 900000),
  ('Barcelona', 'sale', 41.3970, 2.1590, 4000, 900000);

drop view public.network_properties;
create view public.network_properties with (security_invoker = true) as
  select p.id, p.ref, p.operation, p.type, p.title, p.description, p.zone, p.city, p.price,
         p.built_m2, p.plot_m2, p.terrace_m2, p.bedrooms, p.bathrooms, p.energy_rating,
         p.badge, p.featured, p.status, p.scene, p.published_at, p.source, p.source_url,
         a.id as agency_id, coalesce(p.agency_display, a.name) as agency_name, a.slug as agency_slug,
         a.is_owner as own_listing,
         (select coalesce(json_agg(json_build_object('url', i.url, 'alt', i.alt) order by i.position), '[]'::json)
            from public.property_images i where i.property_id = p.id) as images
  from public.properties p join public.agencies a on a.id = p.agency_id
  where (select private.property_visible(p.id));
grant select on public.network_properties to anon, authenticated;
