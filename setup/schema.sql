-- =====================================================================
--  رصد · Rasd — إعداد قاعدة البيانات على Supabase
--  الصق هذا الملف كاملاً في: SQL Editor ← New query ← Run  (مرة واحدة)
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Running it again is safe: it only adds what is missing and never deletes data.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_code text not null,
  building_ar text not null,
  building_en text not null,
  label_ar text not null,
  label_en text not null,
  kind text not null check (kind in ('flat','common')),
  token text not null unique,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  role text not null check (role in ('technician','supervisor','admin')),
  pin_hash text not null,
  active boolean not null default true,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token_hash text primary key,
  staff_id uuid not null references public.staff(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  no bigint generated always as identity (start with 1001) unique,
  unit_id uuid not null references public.units(id),
  building_code text not null,
  building_ar text not null,
  building_en text not null,
  unit_ar text not null,
  unit_en text not null,
  unit_kind text not null,
  issue_type text not null,
  priority text not null check (priority in ('urgent','normal')),
  target_arrive int not null,
  target_work int not null,
  description text not null,
  photo_before text not null,
  lang text not null default 'ar',
  contact_name text,
  contact_phone text,
  tracking_code text not null,
  status text not null default 'new' check (status in ('new','accepted','onsite','finished','closed','cancelled')),
  created_at timestamptz not null default now(),
  technician_id uuid references public.staff(id),
  accepted_at timestamptz,
  accept_method text,
  arrived_at timestamptz,
  arrival_method text,
  arrival_note text,
  arrival_lat double precision,
  arrival_lng double precision,
  arrival_acc double precision,
  finished_at timestamptz,
  photo_after text,
  tech_note text,
  signature text,
  signer_name text,
  signoff_method text,
  rating int check (rating between 1 and 5),
  rating_comment text,
  signed_at timestamptz,
  closed_at timestamptz,
  close_method text,
  close_note text,
  cancelled_at timestamptz,
  cancel_note text
);
create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_unit_idx on public.requests (unit_id, created_at desc);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  at timestamptz not null default now(),
  actor uuid references public.staff(id) on delete set null,
  ev text not null,
  note text
);
create index if not exists events_request_idx on public.events (request_id, at);

-- No one reads or writes the tables directly: every change goes through the
-- functions below, which check the sign-in and stamp the server's own clock.
alter table public.settings enable row level security;
alter table public.units    enable row level security;
alter table public.staff    enable row level security;
alter table public.sessions enable row level security;
alter table public.requests enable row level security;
alter table public.events   enable row level security;
revoke all on public.settings, public.units, public.staff, public.sessions, public.requests, public.events
  from anon, authenticated;

-- --------------------------------------------------------------- helpers
create or replace function public._norm_phone(p text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case when d like '00%' then substr(d, 3)
              when length(d) = 8 then '968' || d
              else d end
  from (select regexp_replace(translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
                              '[^0-9]', '', 'g') as d) x
$$;

create or replace function public._auth(p_token text, p_roles text[] default null) returns public.staff
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare s public.staff;
begin
  select st.* into s
    from public.sessions se join public.staff st on st.id = se.staff_id
   where se.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and se.expires_at > now() and st.active;
  if not found then raise exception 'auth_required'; end if;
  if p_roles is not null and not (s.role = any (p_roles)) then raise exception 'not_allowed'; end if;
  return s;
end $$;

create or replace function public._new_session(p_staff uuid) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_token text := encode(gen_random_bytes(32), 'hex'); s public.staff;
begin
  delete from public.sessions where expires_at < now();
  insert into public.sessions (token_hash, staff_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_staff, now() + interval '90 days');
  select * into s from public.staff where id = p_staff;
  return json_build_object('token', v_token,
    'me', json_build_object('id', s.id, 'name', s.full_name, 'role', s.role, 'phone', s.phone));
end $$;

create or replace function public._targets(p_building text, p_priority text) returns int[]
language sql stable security definer set search_path = public, pg_temp as $$
  select array[
    coalesce(nullif(s.data #>> array['buildings', p_building, 'arrive', p_priority], '')::int,
             nullif(s.data #>> array['targets', p_priority, 'arrive'], '')::int,
             case when p_priority = 'urgent' then 60 else 240 end),
    coalesce(nullif(s.data #>> array['targets', p_priority, 'work'], '')::int,
             case when p_priority = 'urgent' then 120 else 240 end)]
  from public.settings s where s.id = 1
$$;

create or replace function public._event(p_id uuid, p_actor uuid, p_ev text, p_note text default null) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.events (request_id, actor, ev, note) values (p_id, p_actor, p_ev, nullif(trim(coalesce(p_note, '')), ''))
$$;

-- --------------------------------------------------------- public (tenant)
create or replace function public.get_settings() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select data::json from public.settings where id = 1
$$;

create or replace function public.unit_info(p_token text) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object('id', u.id, 'building_code', u.building_code, 'building_ar', u.building_ar, 'building_en', u.building_en,
                           'label_ar', u.label_ar, 'label_en', u.label_en, 'kind', u.kind,
                           'issues', (select s.data->'issueTypes' from public.settings s where s.id = 1))
  from public.units u where u.token = p_token and u.active
$$;

create or replace function public.submit_request(p_token text, p_issue text, p_description text, p_photo text,
  p_lang text default 'ar', p_name text default null, p_phone text default null) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare u public.units; v_pri text; v_t int[]; v_code text; r public.requests;
begin
  select * into u from public.units where token = p_token and active;
  if not found then raise exception 'invalid_unit'; end if;
  select e->>'p' into v_pri
    from public.settings s, jsonb_array_elements(s.data->'issueTypes') e
   where s.id = 1 and e->>'k' = p_issue limit 1;
  if v_pri is null then raise exception 'issue_required'; end if;
  if coalesce(length(trim(p_description)), 0) < 3 then raise exception 'description_required'; end if;
  if coalesce(p_photo, '') !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) < 1000 then raise exception 'photo_required'; end if;
  if length(p_photo) > 1500000 then raise exception 'photo_too_large'; end if;
  if (select count(*) from public.requests where unit_id = u.id and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'slow_down';
  end if;
  v_t := public._targets(u.building_code, v_pri);
  v_code := encode(gen_random_bytes(12), 'hex');
  insert into public.requests (unit_id, building_code, building_ar, building_en, unit_ar, unit_en, unit_kind,
      issue_type, priority, target_arrive, target_work, description, photo_before, lang,
      contact_name, contact_phone, tracking_code)
  values (u.id, u.building_code, u.building_ar, u.building_en, u.label_ar, u.label_en, u.kind,
      p_issue, v_pri, v_t[1], v_t[2], left(trim(p_description), 2000), p_photo,
      case when p_lang = 'en' then 'en' else 'ar' end,
      nullif(left(trim(coalesce(p_name, '')), 80), ''), nullif(left(trim(coalesce(p_phone, '')), 20), ''), v_code)
  returning * into r;
  perform public._event(r.id, null, 'submitted');
  return json_build_object('id', r.id, 'no', r.no, 'code', v_code, 'created_at', r.created_at);
end $$;

create or replace function public.track_request(p_id uuid, p_code text) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'id', r.id, 'no', r.no, 'status', r.status, 'issue_type', r.issue_type, 'description', r.description,
    'building_ar', r.building_ar, 'building_en', r.building_en, 'unit_ar', r.unit_ar, 'unit_en', r.unit_en,
    'unit_kind', r.unit_kind, 'created_at', r.created_at, 'accepted_at', r.accepted_at, 'arrived_at', r.arrived_at,
    'finished_at', r.finished_at, 'closed_at', r.closed_at, 'cancelled_at', r.cancelled_at,
    'signed_at', r.signed_at, 'signoff_method', r.signoff_method, 'rating', r.rating, 'tech_note', r.tech_note,
    'photo_after', case when r.status in ('finished','closed') then r.photo_after end,
    'technician', (select t.full_name from public.staff t where t.id = r.technician_id))
  from public.requests r where r.id = p_id and r.tracking_code = p_code
$$;

create or replace function public.tenant_signoff(p_id uuid, p_code text, p_signature text, p_rating int,
  p_comment text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'rating_required'; end if;
  if coalesce(p_signature, '') !~ '^data:image/png;base64,' or length(p_signature) > 400000 then raise exception 'signature_required'; end if;
  update public.requests
     set signature = p_signature, signer_name = null, signoff_method = 'tenant', rating = p_rating,
         rating_comment = nullif(left(trim(coalesce(p_comment, '')), 1000), ''), signed_at = now(),
         closed_at = now(), close_method = 'signed', status = 'closed'
   where id = p_id and tracking_code = p_code and status = 'finished';
  if not found then raise exception 'not_ready'; end if;
  perform public._event(p_id, null, 'signed_tenant');
end $$;

-- ------------------------------------------------------------- sign-in
create or replace function public.setup_status() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object('ready', exists (select 1 from public.staff where role = 'admin' and active))
$$;

create or replace function public.setup_admin(p_name text, p_phone text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid; v_phone text := public._norm_phone(p_phone);
begin
  perform pg_advisory_xact_lock(7311);
  if exists (select 1 from public.staff where role = 'admin' and active) then raise exception 'already_setup'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'name_required'; end if;
  if length(v_phone) < 8 then raise exception 'phone_required'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' then raise exception 'pin_format'; end if;
  insert into public.staff (full_name, phone, role, pin_hash)
  values (left(trim(p_name), 80), v_phone, 'admin', crypt(p_pin, gen_salt('bf', 8)))
  on conflict (phone) do update set role = 'admin', full_name = excluded.full_name, pin_hash = excluded.pin_hash,
                                    active = true, failed_logins = 0, locked_until = null
  returning id into v_id;
  return public._new_session(v_id);
end $$;

create or replace function public.staff_login(p_phone text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare s public.staff;
begin
  select * into s from public.staff where phone = public._norm_phone(p_phone) for update;
  if not found or not s.active then return json_build_object('error', 'bad_login'); end if;
  if s.locked_until is not null and s.locked_until > now() then
    return json_build_object('error', 'locked', 'until', s.locked_until);
  end if;
  if s.pin_hash <> crypt(coalesce(p_pin, ''), s.pin_hash) then
    if s.failed_logins + 1 >= 5 then
      update public.staff set failed_logins = 0, locked_until = now() + interval '15 minutes' where id = s.id;
      return json_build_object('error', 'locked');
    end if;
    update public.staff set failed_logins = s.failed_logins + 1 where id = s.id;
    return json_build_object('error', 'bad_login');
  end if;
  update public.staff set failed_logins = 0, locked_until = null where id = s.id;
  return public._new_session(s.id);
end $$;

create or replace function public.staff_logout(p_token text) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  delete from public.sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function public.staff_me(p_token text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  return json_build_object('id', me.id, 'name', me.full_name, 'role', me.role, 'phone', me.phone);
end $$;

-- ------------------------------------------------------- staff: reading
create or replace function public.staff_requests(p_token text, p_from timestamptz default null,
  p_to timestamptz default null) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  return coalesce((
    select json_agg(x order by x.created_at desc) from (
      select r.id, r.no, r.unit_id, r.building_code, r.building_ar, r.building_en, r.unit_ar, r.unit_en, r.unit_kind,
             r.issue_type, r.priority, r.target_arrive, r.target_work, left(r.description, 280) as description,
             r.lang, r.contact_name, r.contact_phone, r.status, r.created_at, r.technician_id,
             t.full_name as technician, r.accepted_at, r.accept_method, r.arrived_at, r.arrival_method,
             r.finished_at, r.signed_at, r.signoff_method, r.rating, r.closed_at, r.close_method, r.cancelled_at
        from public.requests r left join public.staff t on t.id = r.technician_id
       where (me.role in ('supervisor','admin') or r.status = 'new' or r.technician_id = me.id)
         and (r.status in ('new','accepted','onsite','finished')
              or ((p_from is null or r.created_at >= p_from) and (p_to is null or r.created_at < p_to)))
    ) x), '[]'::json);
end $$;

create or replace function public.staff_request(p_token text, p_id uuid) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests;
begin
  select * into r from public.requests where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if me.role = 'technician' and r.status <> 'new' and r.technician_id is distinct from me.id then
    raise exception 'not_allowed';
  end if;
  return (to_jsonb(r) - 'tracking_code'
          || jsonb_build_object(
               'technician', (select t.full_name from public.staff t where t.id = r.technician_id),
               'events', coalesce((select jsonb_agg(jsonb_build_object('at', e.at, 'ev', e.ev, 'note', e.note,
                                                    'actor', s.full_name) order by e.at, e.id)
                                     from public.events e left join public.staff s on s.id = e.actor
                                    where e.request_id = r.id), '[]'::jsonb)))::json;
end $$;

-- ------------------------------------------------------ staff: actions
create or replace function public.tech_accept(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  update public.requests set status = 'accepted', technician_id = me.id, accepted_at = now(), accept_method = 'self'
   where id = p_id and status = 'new';
  if not found then raise exception 'already_taken'; end if;
  perform public._event(p_id, me.id, 'accepted');
end $$;

create or replace function public.tech_arrive(p_token text, p_id uuid, p_unit_token text default null,
  p_note text default null, p_lat double precision default null, p_lng double precision default null,
  p_acc double precision default null) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests; v_token text; v_method text;
begin
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'accepted' then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  select token into v_token from public.units where id = r.unit_id;
  if nullif(trim(coalesce(p_unit_token, '')), '') is not null then
    if trim(p_unit_token) <> v_token then raise exception 'wrong_unit'; end if;
    v_method := 'qr';
  else
    if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
    v_method := 'manual';
  end if;
  update public.requests
     set status = 'onsite', arrived_at = now(), arrival_method = v_method,
         arrival_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
         arrival_lat = p_lat, arrival_lng = p_lng, arrival_acc = p_acc
   where id = p_id;
  perform public._event(p_id, me.id, 'arrived_' || v_method, left(p_note, 500));
  return v_method;
end $$;

create or replace function public.tech_finish(p_token text, p_id uuid, p_photo text, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests;
begin
  if coalesce(p_photo, '') !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) < 1000 then raise exception 'photo_required'; end if;
  if length(p_photo) > 1500000 then raise exception 'photo_too_large'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'onsite' then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  update public.requests set status = 'finished', finished_at = now(), photo_after = p_photo,
         tech_note = nullif(left(trim(coalesce(p_note, '')), 1000), '')
   where id = p_id;
  perform public._event(p_id, me.id, 'finished', left(p_note, 500));
end $$;

create or replace function public.onsite_signoff(p_token text, p_id uuid, p_signature text, p_signer text,
  p_rating int, p_comment text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests;
begin
  if coalesce(length(trim(p_signer)), 0) < 2 then raise exception 'signer_required'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'rating_required'; end if;
  if coalesce(p_signature, '') !~ '^data:image/png;base64,' or length(p_signature) > 400000 then raise exception 'signature_required'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'finished' then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  update public.requests
     set signature = p_signature, signer_name = left(trim(p_signer), 80), signoff_method = 'onsite', rating = p_rating,
         rating_comment = nullif(left(trim(coalesce(p_comment, '')), 1000), ''), signed_at = now(),
         closed_at = now(), close_method = 'signed', status = 'closed'
   where id = p_id;
  perform public._event(p_id, me.id, 'signed_onsite', left(trim(p_signer), 80));
end $$;

-- -------------------------------------------------- supervisor and admin
create or replace function public.mgr_assign(p_token text, p_id uuid, p_staff uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests; v_name text;
begin
  select full_name into v_name from public.staff where id = p_staff and active;
  if v_name is null then raise exception 'bad_technician'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status not in ('new','accepted','onsite','finished') then raise exception 'not_ready'; end if;
  if r.status = 'new' then
    update public.requests set status = 'accepted', technician_id = p_staff, accepted_at = now(), accept_method = 'assigned'
     where id = p_id;
    perform public._event(p_id, me.id, 'assigned', v_name);
  else
    update public.requests set technician_id = p_staff where id = p_id;
    perform public._event(p_id, me.id, 'reassigned', v_name);
  end if;
end $$;

create or replace function public.mgr_priority(p_token text, p_id uuid, p_priority text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests; v_t int[];
begin
  if p_priority not in ('urgent','normal') then raise exception 'bad_priority'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status in ('closed','cancelled') then raise exception 'not_ready'; end if;
  if r.priority = p_priority then return; end if;
  v_t := public._targets(r.building_code, p_priority);
  update public.requests set priority = p_priority, target_arrive = v_t[1], target_work = v_t[2] where id = p_id;
  perform public._event(p_id, me.id, 'priority_' || p_priority);
end $$;

create or replace function public.mgr_close(p_token text, p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
  update public.requests set status = 'closed', closed_at = now(), close_method = 'manual', close_note = left(trim(p_note), 500)
   where id = p_id and status in ('accepted','onsite','finished');
  if not found then raise exception 'not_ready'; end if;
  perform public._event(p_id, me.id, 'closed_manual', left(trim(p_note), 500));
end $$;

create or replace function public.mgr_cancel(p_token text, p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
  update public.requests set status = 'cancelled', cancelled_at = now(), cancel_note = left(trim(p_note), 500)
   where id = p_id and status not in ('closed','cancelled');
  if not found then raise exception 'not_ready'; end if;
  perform public._event(p_id, me.id, 'cancelled', left(trim(p_note), 500));
end $$;

create or replace function public.team_list(p_token text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return coalesce((select json_agg(json_build_object('id', s.id, 'name', s.full_name, 'phone', s.phone, 'role', s.role,
                     'active', s.active, 'locked', coalesce(s.locked_until > now(), false), 'created_at', s.created_at)
                     order by s.active desc, s.role, s.full_name)
                   from public.staff s), '[]'::json);
end $$;

create or replace function public.admin_save_staff(p_token text, p_id uuid, p_name text, p_phone text, p_role text,
  p_active boolean default true, p_pin text default null) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']); v_id uuid; v_phone text := public._norm_phone(p_phone);
begin
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'name_required'; end if;
  if length(v_phone) < 8 then raise exception 'phone_required'; end if;
  if p_role not in ('technician','supervisor','admin') then raise exception 'bad_role'; end if;
  if nullif(p_pin, '') is not null and p_pin !~ '^[0-9]{6}$' then raise exception 'pin_format'; end if;
  if exists (select 1 from public.staff where phone = v_phone and id is distinct from p_id) then raise exception 'phone_taken'; end if;
  if p_id is null then
    if nullif(p_pin, '') is null then raise exception 'pin_format'; end if;
    insert into public.staff (full_name, phone, role, pin_hash, active)
    values (left(trim(p_name), 80), v_phone, p_role, crypt(p_pin, gen_salt('bf', 8)), coalesce(p_active, true))
    returning id into v_id;
  else
    if p_id = me.id and (p_role <> 'admin' or not coalesce(p_active, true)) then raise exception 'not_self'; end if;
    update public.staff
       set full_name = left(trim(p_name), 80), phone = v_phone, role = p_role, active = coalesce(p_active, true),
           pin_hash = case when nullif(p_pin, '') is not null then crypt(p_pin, gen_salt('bf', 8)) else pin_hash end,
           failed_logins = case when nullif(p_pin, '') is not null then 0 else failed_logins end,
           locked_until = case when nullif(p_pin, '') is not null then null else locked_until end
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
    if nullif(p_pin, '') is not null or not coalesce(p_active, true) then
      delete from public.sessions where staff_id = v_id and (p_id <> me.id);
    end if;
  end if;
  return json_build_object('id', v_id);
end $$;

create or replace function public.admin_units(p_token text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']);
begin
  return coalesce((select json_agg(json_build_object('id', u.id, 'building_code', u.building_code,
                     'building_ar', u.building_ar, 'building_en', u.building_en, 'label_ar', u.label_ar,
                     'label_en', u.label_en, 'kind', u.kind, 'token', u.token, 'active', u.active, 'sort', u.sort)
                     order by u.building_code, u.sort, u.label_en)
                   from public.units u), '[]'::json);
end $$;

create or replace function public.admin_add_unit(p_token text, p_building_code text, p_building_ar text,
  p_building_en text, p_kind text, p_label_ar text, p_label_en text, p_sort int default 0) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']); v_code text := upper(trim(coalesce(p_building_code, '')));
        v_token text; v_id uuid;
begin
  if v_code !~ '^[A-Z0-9]{2,8}$' then raise exception 'bad_building'; end if;
  if coalesce(length(trim(p_building_ar)), 0) < 2 or coalesce(length(trim(p_building_en)), 0) < 2 then raise exception 'bad_building'; end if;
  if p_kind not in ('flat','common') then raise exception 'bad_kind'; end if;
  if coalesce(length(trim(p_label_ar)), 0) < 1 or coalesce(length(trim(p_label_en)), 0) < 1 then raise exception 'label_required'; end if;
  if exists (select 1 from public.units where building_code = v_code and label_en = trim(p_label_en)) then raise exception 'unit_exists'; end if;
  v_token := lower(v_code) || '-' || substr(encode(gen_random_bytes(6), 'hex'), 1, 8);
  insert into public.units (building_code, building_ar, building_en, label_ar, label_en, kind, token, sort)
  values (v_code, trim(p_building_ar), trim(p_building_en), trim(p_label_ar), trim(p_label_en), p_kind, v_token, coalesce(p_sort, 0))
  returning id into v_id;
  return json_build_object('id', v_id, 'token', v_token);
end $$;

create or replace function public.admin_unit_active(p_token text, p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']);
begin
  update public.units set active = coalesce(p_active, true) where id = p_id;
end $$;

create or replace function public.admin_save_settings(p_token text, p_data jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']);
begin
  if jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data->'issueTypes') <> 'array'
     or jsonb_array_length(p_data->'issueTypes') = 0
     or exists (select 1 from jsonb_array_elements(p_data->'issueTypes') e
                 where coalesce(e->>'k', '') = '' or coalesce(e->>'p', '') not in ('urgent','normal')
                    or coalesce(e->>'ar', '') = '' or coalesce(e->>'en', '') = '') then
    raise exception 'bad_settings';
  end if;
  insert into public.settings (id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

-- ------------------------------------------------------ who may call what
revoke all on function public._norm_phone(text), public._auth(text, text[]), public._new_session(uuid),
  public._targets(text, text), public._event(uuid, uuid, text, text) from public, anon, authenticated;

revoke all on function
  public.get_settings(), public.unit_info(text), public.submit_request(text,text,text,text,text,text,text),
  public.track_request(uuid,text), public.tenant_signoff(uuid,text,text,int,text),
  public.setup_status(), public.setup_admin(text,text,text), public.staff_login(text,text),
  public.staff_logout(text), public.staff_me(text), public.staff_requests(text,timestamptz,timestamptz),
  public.staff_request(text,uuid), public.tech_accept(text,uuid),
  public.tech_arrive(text,uuid,text,text,double precision,double precision,double precision),
  public.tech_finish(text,uuid,text,text), public.onsite_signoff(text,uuid,text,text,int,text),
  public.mgr_assign(text,uuid,uuid), public.mgr_priority(text,uuid,text), public.mgr_close(text,uuid,text),
  public.mgr_cancel(text,uuid,text), public.team_list(text),
  public.admin_save_staff(text,uuid,text,text,text,boolean,text), public.admin_units(text),
  public.admin_add_unit(text,text,text,text,text,text,text,int), public.admin_unit_active(text,uuid,boolean),
  public.admin_save_settings(text,jsonb)
  from public;

grant execute on function
  public.get_settings(), public.unit_info(text), public.submit_request(text,text,text,text,text,text,text),
  public.track_request(uuid,text), public.tenant_signoff(uuid,text,text,int,text),
  public.setup_status(), public.setup_admin(text,text,text), public.staff_login(text,text),
  public.staff_logout(text), public.staff_me(text), public.staff_requests(text,timestamptz,timestamptz),
  public.staff_request(text,uuid), public.tech_accept(text,uuid),
  public.tech_arrive(text,uuid,text,text,double precision,double precision,double precision),
  public.tech_finish(text,uuid,text,text), public.onsite_signoff(text,uuid,text,text,int,text),
  public.mgr_assign(text,uuid,uuid), public.mgr_priority(text,uuid,text), public.mgr_close(text,uuid,text),
  public.mgr_cancel(text,uuid,text), public.team_list(text),
  public.admin_save_staff(text,uuid,text,text,text,boolean,text), public.admin_units(text),
  public.admin_add_unit(text,text,text,text,text,text,text,int), public.admin_unit_active(text,uuid,boolean),
  public.admin_save_settings(text,jsonb)
  to anon, authenticated;

-- ------------------------------------------------------------- first data
insert into public.settings (id, data) values (1, $json${"contractor":{"ar":"الطاؤوس","en":"Tawoos"},"targets":{"urgent":{"pickup":15,"arrive":60,"work":120},"normal":{"pickup":60,"arrive":240,"work":240}},"buildings":{"AZB":{"arrive":{"urgent":null,"normal":null},"lat":null,"lng":null}},"repeatDays":30,"issueTypes":[{"k":"water_leak","p":"urgent","ar":"تسرّب مياه أو فيضان","en":"Water leak or flooding"},{"k":"no_power","p":"urgent","ar":"انقطاع الكهرباء","en":"Power outage"},{"k":"sparks","p":"urgent","ar":"شرارة أو رائحة احتراق","en":"Sparks or burning smell"},{"k":"no_water","p":"urgent","ar":"انقطاع المياه","en":"No water supply"},{"k":"drain_overflow","p":"urgent","ar":"انسداد أو طفح المجاري","en":"Blocked or overflowing drain"},{"k":"door_lock","p":"urgent","ar":"باب لا يُقفل","en":"Door will not lock"},{"k":"lift","p":"urgent","ar":"المصعد متوقف أو عالق","en":"Lift stopped or stuck"},{"k":"ac","p":"normal","ar":"المكيف لا يعمل أو لا يبرّد","en":"AC not working or not cooling"},{"k":"lights","p":"normal","ar":"إنارة لا تعمل","en":"Lights not working"},{"k":"sockets","p":"normal","ar":"أفياش أو مفاتيح كهرباء","en":"Sockets or switches"},{"k":"heater","p":"normal","ar":"سخان الماء","en":"Water heater"},{"k":"plumbing","p":"normal","ar":"حنفية أو سيفون أو شطاف","en":"Tap, toilet flush or hand spray"},{"k":"carpentry","p":"normal","ar":"أبواب أو نوافذ أو خزائن","en":"Doors, windows or cupboards"},{"k":"pests","p":"normal","ar":"حشرات","en":"Pests"},{"k":"other","p":"normal","ar":"أخرى","en":"Other"}]}$json$::jsonb)
on conflict (id) do nothing;

-- مبنى العذيبة · Azaiba Building — 25 QR codes (do not change the tokens: they are printed on the labels)
insert into public.units (building_code, building_ar, building_en, label_ar, label_en, kind, token, sort) values
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 11', 'Flat 11', 'flat', 'azb11-v6jt9x', 11),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 12', 'Flat 12', 'flat', 'azb12-vhbyze', 12),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 13', 'Flat 13', 'flat', 'azb13-bky9gm', 13),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 14', 'Flat 14', 'flat', 'azb14-msr63u', 14),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 21', 'Flat 21', 'flat', 'azb21-n7qnnu', 21),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 22', 'Flat 22', 'flat', 'azb22-4eu76z', 22),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 23', 'Flat 23', 'flat', 'azb23-rt4t62', 23),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 24', 'Flat 24', 'flat', 'azb24-cunkud', 24),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 31', 'Flat 31', 'flat', 'azb31-7zped2', 31),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 32', 'Flat 32', 'flat', 'azb32-sj2xbm', 32),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 33', 'Flat 33', 'flat', 'azb33-49c27v', 33),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 34', 'Flat 34', 'flat', 'azb34-sv3ah9', 34),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 41', 'Flat 41', 'flat', 'azb41-c3u93h', 41),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 42', 'Flat 42', 'flat', 'azb42-abp626', 42),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 43', 'Flat 43', 'flat', 'azb43-yjchw5', 43),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 44', 'Flat 44', 'flat', 'azb44-cnxm69', 44),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 51', 'Flat 51', 'flat', 'azb51-7jawz3', 51),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 52', 'Flat 52', 'flat', 'azb52-x8c3aq', 52),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 53', 'Flat 53', 'flat', 'azb53-yhc6ms', 53),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 54', 'Flat 54', 'flat', 'azb54-eea9wx', 54),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 61', 'Flat 61', 'flat', 'azb61-kz68wf', 61),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 62', 'Flat 62', 'flat', 'azb62-wgfyu9', 62),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 63', 'Flat 63', 'flat', 'azb63-f3jjhw', 63),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'شقة 64', 'Flat 64', 'flat', 'azb64-tst374', 64),
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'المنطقة العامة', 'Common area', 'common', 'azbc-b8xswv', 100)
on conflict (token) do nothing;

notify pgrst, 'reload schema';

select 'رصد جاهز · Rasd is ready' as result;
