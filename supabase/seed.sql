-- Datos iniciales. Las agencias colaboradoras y sus inmuebles son EJEMPLOS (is_demo = true).
-- Para borrarlos:  delete from public.agencies where is_demo;

insert into public.agencies (slug, name, is_owner, phone, email, city, feed_format, commission_share, is_demo) values
  ('airama', 'Airama Propiedades', true, '+34 910 000 410', 'hola@airama.es', 'Madrid', 'manual', 100, false),
  ('mediterranea-homes', 'Mediterránea Homes', false, '+34 952 000 300', 'info@mediterranea.example', 'Marbella', 'kyero', 50, true),
  ('illa-daurada', 'Illa Daurada Properties', false, '+34 971 000 500', 'info@illadaurada.example', 'Palma', 'kyero', 50, true),
  ('norte-habitat', 'Norte Hábitat', false, '+34 913 000 700', 'info@nortehabitat.example', 'Madrid', 'manual', 50, true)
on conflict (slug) do nothing;

insert into public.zones (slug, name, description, avg_price_m2, scene, sort) values
  ('madrid', 'Madrid', 'Salamanca, Chamberí, Almagro y La Moraleja. Pisos señoriales y áticos con terraza.', 11400, 'city', 1),
  ('marbella', 'Marbella', 'Sierra Blanca, Golden Mile y Nueva Andalucía. Villas contemporáneas con vistas al mar.', 8900, 'sea', 2),
  ('mallorca', 'Mallorca', 'Port d''Andratx, Deià y Santa Ponsa. Fincas de piedra y casas frente al Mediterráneo.', 9600, 'country', 3),
  ('barcelona', 'Barcelona', 'Eixample, Sant Gervasi y Pedralbes. Pisos modernistas y casas en la zona alta.', 7800, 'city', 4)
on conflict (slug) do nothing;

with a as (select id, slug from public.agencies)
insert into public.properties
  (agency_id, ref, operation, type, title, description, zone, city, price, built_m2, plot_m2, terrace_m2,
   bedrooms, bathrooms, energy_rating, badge, featured, shared, scene)
select a.id, v.ref, v.op, v.tipo, v.title, v.descr, v.zone, v.city, v.price, v.m2, v.plot, v.terr,
       v.dorm, v.banos, v.ee, v.badge, v.feat, v.shared, v.scene
from (values
  ('airama','AIR-2417','venta','Villa','Villa contemporánea en Sierra Blanca','Arquitectura de líneas puras en la urbanización más reservada de Marbella. Salón a doble altura abierto a la piscina infinita, spa con sauna, bodega y vistas despejadas al Mediterráneo y a Gibraltar.','Marbella','Marbella',6950000,812,2400,null,6,7,'A','Exclusiva',true,true,'sea'),
  ('airama','AIR-2391','venta','Ático','Ático con terraza en Almagro','Última planta de un edificio de 1912 rehabilitado. Terraza de 110 m² con vistas a las cúpulas del centro, cocina de autor y dos plazas de garaje.','Madrid','Madrid',3400000,286,null,110,4,4,'B','Novedad',true,true,'city'),
  ('airama','AIR-2388','venta','Finca','Finca de piedra en Deià','Casa mallorquina del siglo XVIII entre olivos centenarios y bancales de piedra seca. Torre de defensa restaurada, piscina de agua salada y licencia de alquiler vacacional.','Mallorca','Deià',4750000,540,18000,null,5,5,'C',null,true,true,'country'),
  ('airama','AIR-2399','alquiler','Piso','Piso señorial en el barrio de Salamanca','Exterior a la calle Velázquez, con balcones corridos, suelos de roble en espiga y portería física. Se alquila sin muebles.','Madrid','Madrid',9800,265,null,null,4,3,'C',null,false,true,'city'),
  ('mediterranea-homes','MED-0412','venta','Ático','Ático en primera línea, Golden Mile','Ático frente a la playa en un complejo con seguridad 24 horas. Terraza envolvente con jacuzzi y acceso directo al paseo marítimo.','Marbella','Marbella',2850000,214,null,95,3,3,'A',null,true,true,'sea'),
  ('mediterranea-homes','MED-0398','venta','Piso','Piso modernista en el Eixample','Planta noble de una finca de 1904 con techos de 4,2 metros, mosaico hidráulico original y galería acristalada orientada a un patio de manzana ajardinado.','Barcelona','Barcelona',1980000,238,null,null,4,3,'D',null,true,true,'city'),
  ('illa-daurada','ILD-1120','alquiler','Villa','Villa frente al mar en Port d''Andratx','Alquiler de larga temporada, amueblada. Embarcadero privado, piscina climatizada y vistas al puerto. Contrato mínimo de doce meses.','Mallorca','Andratx',18500,420,1500,null,5,5,'A','Disponible',true,true,'sea'),
  ('illa-daurada','ILD-1131','venta','Casa','Casa de pueblo en Sóller','Casa de piedra rehabilitada a dos calles de la plaza, con patio de naranjos, terraza con vistas a la Serra de Tramuntana y cocina de leña original.','Mallorca','Sóller',1390000,210,180,40,4,3,'E',null,false,true,'country'),
  ('norte-habitat','NHM-0077','venta','Villa','Casa con jardín en La Moraleja','Vivienda familiar en parcela llana con jardín maduro, pista de pádel, casa de invitados y garaje para cinco coches. A diez minutos de los colegios internacionales.','Madrid','Alcobendas',5200000,980,3100,null,7,8,'B',null,true,true,'country'),
  ('norte-habitat','NHM-0081','venta','Piso','Piso reservado a la cartera de Norte Hábitat','Inmueble no compartido con la red: no debe aparecer en la web de Airama.','Madrid','Madrid',990000,120,null,null,3,2,'C',null,false,false,'city')
) as v(agency, ref, op, tipo, title, descr, zone, city, price, m2, plot, terr, dorm, banos, ee, badge, feat, shared, scene)
join a on a.slug = v.agency
on conflict (ref) do nothing;

insert into public.property_images (property_id, url, alt, position)
select p.id, v.url, p.title, 0
from (values
  ('AIR-2417','https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=75'),
  ('AIR-2391','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=75'),
  ('AIR-2388','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=75'),
  ('AIR-2399','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=75'),
  ('MED-0412','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=75'),
  ('MED-0398','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=75'),
  ('ILD-1120','https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=75'),
  ('NHM-0077','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=75')
) as v(ref, url)
join public.properties p on p.ref = v.ref
where not exists (select 1 from public.property_images i where i.property_id = p.id);
