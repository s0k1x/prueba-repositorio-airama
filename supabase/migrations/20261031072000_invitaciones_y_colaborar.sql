-- Invitaciones: un admin invita por correo; al registrarse en el panel, el usuario
-- queda vinculado a su agencia automáticamente.
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

-- Nuevo motivo de contacto para agencias que quieren unirse a la red
alter table public.leads drop constraint leads_interes_check;
alter table public.leads add constraint leads_interes_check
  check (interes in ('Comprar','Vender','Alquilar','Valorar','Colaborar'));
