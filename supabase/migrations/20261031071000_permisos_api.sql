-- Permisos explícitos para la API (RLS sigue decidiendo qué filas ve cada uno)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.agencies, public.zones, public.properties, public.property_images to anon, authenticated;
grant select on public.network_properties to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select, update on public.leads to authenticated;
grant insert, update, delete on public.agencies, public.zones, public.properties, public.property_images to authenticated;
grant select, insert, update, delete on public.agency_members to authenticated;
grant select on public.feed_imports to authenticated;
grant usage on sequence public.property_ref_seq to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
