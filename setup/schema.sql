-- =====================================================================
--  رصد · Rasd — إعداد قاعدة البيانات على Supabase (الإصدار 2)
--  الصق هذا الملف كاملاً في: SQL Editor ← New query ← Run
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Running it again, or over the first version, is safe: it only adds what
--  is missing and updates the functions. It never deletes data.
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

-- Phone notifications: the server keys (made once by the admin in Settings) and each phone that switched them on.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  subject text not null,
  fn_url text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.push_subs (
  endpoint text primary key,
  staff_id uuid not null references public.staff(id) on delete cascade,
  sub jsonb not null,
  lang text not null default 'ar',
  created_at timestamptz not null default now()
);
alter table public.requests add column if not exists escalated_at timestamptz;

-- ------------------------------------------------- version 2: teams, pauses, parts
-- Technicians belong to a team: the building handymen (hm) or the operations room (ops).
alter table public.staff add column if not exists team text not null default 'ops';
alter table public.staff add column if not exists sites text[] not null default '{}';
do $$ begin alter table public.staff add constraint staff_team_chk check (team in ('hm','ops'));
exception when duplicate_object then null; end $$;

-- A request is with one team at a time (stage). Earlier visits (a handyman who handed it to the
-- operations room, or a technician who was replaced) are kept in legs. Paused time is kept in seconds.
alter table public.requests alter column photo_before drop not null;
alter table public.requests add column if not exists source text not null default 'qr';
alter table public.requests add column if not exists created_by uuid references public.staff(id);
alter table public.requests add column if not exists stage text not null default 'ops';
alter table public.requests add column if not exists offered_at timestamptz;
alter table public.requests add column if not exists target_pickup int;
alter table public.requests add column if not exists origin text;
alter table public.requests add column if not exists hold_kind text;
alter table public.requests add column if not exists hold_at timestamptz;
alter table public.requests add column if not exists hold_note text;
alter table public.requests add column if not exists hold_ref uuid;
alter table public.requests add column if not exists hold_eta timestamptz;
alter table public.requests add column if not exists hold_parts jsonb;
alter table public.requests add column if not exists paused_arrive int not null default 0;
alter table public.requests add column if not exists paused_work int not null default 0;
alter table public.requests add column if not exists parts jsonb not null default '[]'::jsonb;
alter table public.requests add column if not exists legs jsonb not null default '[]'::jsonb;
do $$ begin alter table public.requests add constraint requests_stage_chk check (stage in ('hm','ops'));
exception when duplicate_object then null; end $$;
do $$ begin alter table public.requests add constraint requests_hold_chk check (hold_kind is null or hold_kind in ('busy','access','parts','other'));
exception when duplicate_object then null; end $$;
update public.requests set offered_at = created_at where offered_at is null;
create index if not exists requests_hold_ref_idx on public.requests (hold_ref) where hold_ref is not null;
create index if not exists requests_closed_idx on public.requests (closed_at);

-- No one reads or writes the tables directly: every change goes through the
-- functions below, which check the sign-in and stamp the server's own clock.
alter table public.settings enable row level security;
alter table public.units    enable row level security;
alter table public.staff    enable row level security;
alter table public.sessions enable row level security;
alter table public.requests enable row level security;
alter table public.events   enable row level security;
alter table public.push_config enable row level security;
alter table public.push_subs enable row level security;
revoke all on public.settings, public.units, public.staff, public.sessions, public.requests, public.events,
  public.push_config, public.push_subs from anon, authenticated;

-- old signatures replaced in version 2
drop function if exists public.tech_accept(text, uuid);
drop function if exists public.tech_finish(text, uuid, text, text);
drop function if exists public.admin_save_staff(text, uuid, text, text, text, boolean, text);

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
    'me', json_build_object('id', s.id, 'name', s.full_name, 'role', s.role, 'phone', s.phone, 'team', s.team, 'sites', to_json(s.sites)));
end $$;

-- pickup and repair targets by priority: {pickup, work}
create or replace function public._targets(p_building text, p_priority text) returns int[]
language sql stable security definer set search_path = public, pg_temp as $$
  select array[
    coalesce(nullif(s.data #>> array['targets', p_priority, 'pickup'], '')::int, case when p_priority = 'urgent' then 15 else 60 end),
    coalesce(nullif(s.data #>> array['targets', p_priority, 'work'], '')::int, case when p_priority = 'urgent' then 120 else 240 end)]
  from public.settings s where s.id = 1
$$;

-- Arrival target. A handyman is already in the building, so the in-building target applies.
-- The operations room gets the building's travel time; coming from another site, the longer of the two.
create or replace function public._arrive_target(p_building text, p_priority text, p_team text, p_origin text default null) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when p_team = 'hm' or p_origin = p_building then
      coalesce(nullif(s.data #>> array['targets', p_priority, 'arrive'], '')::int, case when p_priority = 'urgent' then 15 else 60 end)
    else greatest(coalesce(nullif(s.data #>> array['buildings', p_building, 'ops'], '')::int, 60),
                  coalesce(nullif(s.data #>> array['buildings', coalesce(p_origin, ''), 'ops'], '')::int, 0))
    end
  from public.settings s where s.id = 1
$$;

-- residential buildings with a handyman start with him; everything else goes to the operations room
create or replace function public._stage_for(p_building text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when coalesce((select s.data #>> array['buildings', p_building, 'type'] from public.settings s where s.id = 1), 'res') = 'res'
               and exists (select 1 from public.staff st where st.active and st.role = 'technician' and st.team = 'hm' and p_building = any (st.sites))
              then 'hm' else 'ops' end
$$;

create or replace function public._team_ids(p_stage text, p_building text) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(st.id), '{}') from public.staff st
   where st.active and st.role = 'technician'
     and case when p_stage = 'hm' then st.team = 'hm' and p_building = any (st.sites) else st.team <> 'hm' end
$$;

-- supervisors and admins; with p_sup_first, supervisors only when there is one
create or replace function public._desk_ids(p_sup_first boolean default false) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select case when p_sup_first and exists (select 1 from public.staff where active and role = 'supervisor')
              then (select array_agg(id) from public.staff where active and role = 'supervisor')
              else (select coalesce(array_agg(id), '{}') from public.staff where active and role in ('supervisor','admin')) end
$$;

-- what a technician may see: his own jobs, new requests for his team, and requests he worked on before
create or replace function public._sees(me public.staff, r public.requests) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce(me.role <> 'technician' or r.technician_id is not distinct from me.id
      or (r.status = 'new' and case when r.stage = 'hm' then me.team = 'hm' and r.building_code = any (me.sites) else me.team <> 'hm' end)
      or r.legs @> jsonb_build_array(jsonb_build_object('staff_id', me.id)), false)
$$;

-- the building a technician is at right now, judged from his own jobs (null: the operations room)
create or replace function public._where(p_staff uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select building_code from (
    select building_code, 1 as k, arrived_at as at from public.requests
     where technician_id = p_staff and status = 'onsite' and hold_kind is null
    union all
    select building_code, 2, finished_at from public.requests
     where technician_id = p_staff and finished_at > now() - interval '90 minutes'
  ) x order by k, at desc limit 1
$$;

create or replace function public._event(p_id uuid, p_actor uuid, p_ev text, p_note text default null) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.events (request_id, actor, ev, note) values (p_id, p_actor, p_ev, nullif(trim(coalesce(p_note, '')), ''))
$$;

-- parts lists: [{"n": name, "q": quantity}]
create or replace function public._clean_parts(p jsonb) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('n', left(trim(e->>'n'), 80),
           'q', case when coalesce(e->>'q', '') ~ '^[0-9]{1,4}([.][0-9]{1,2})?$'
                     then case when (e->>'q')::numeric > 0 then (e->>'q')::numeric else 1 end
                     else 1 end)), '[]'::jsonb)
    from (select e from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) e limit 30) x
   where jsonb_typeof(e) = 'object' and length(trim(coalesce(e->>'n', ''))) > 0
$$;

create or replace function public._parts_text(p jsonb) returns text
language sql immutable set search_path = public, pg_temp as $$
  select string_agg((e->>'n') || case when (e->>'q') in ('1', '1.0') then '' else ' ×' || (e->>'q') end, ', ')
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) e
$$;

-- the current visit as a record, when it ends
create or replace function public._leg(r public.requests, p_outcome text, p_note text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'staff_id', r.technician_id, 'name', (select full_name from public.staff where id = r.technician_id),
    'team', r.stage, 'offered_at', coalesce(r.offered_at, r.created_at), 'accepted_at', r.accepted_at,
    'accept_method', r.accept_method, 'arrived_at', r.arrived_at, 'arrival_method', r.arrival_method,
    'ended_at', now(), 'outcome', p_outcome, 'note', p_note,
    'target_pickup', r.target_pickup, 'target_arrive', r.target_arrive, 'target_work', r.target_work, 'origin', r.origin,
    'paused_arrive', r.paused_arrive + case when r.hold_kind is not null and r.arrived_at is null
                                            then greatest(0, floor(extract(epoch from now() - r.hold_at)))::int else 0 end,
    'paused_work', r.paused_work + case when r.hold_kind is not null and r.arrived_at is not null
                                        then greatest(0, floor(extract(epoch from now() - r.hold_at)))::int else 0 end)
$$;

-- end the current visit and start the next one: back to new (p_staff null) or assigned to p_staff
create or replace function public._handover(p_id uuid, p_outcome text, p_note text, p_staff uuid, p_stage text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.requests; v_origin text := case when p_staff is not null then public._where(p_staff) end;
begin
  select * into r from public.requests where id = p_id;
  update public.requests set
     legs = case when r.technician_id is not null then r.legs || jsonb_build_array(public._leg(r, p_outcome, p_note)) else r.legs end,
     stage = p_stage, technician_id = p_staff,
     status = case when p_staff is null then 'new' else 'accepted' end,
     offered_at = now(),
     accepted_at = case when p_staff is not null then now() end,
     accept_method = case when p_staff is not null then 'assigned' end,
     arrived_at = null, arrival_method = null, arrival_note = null, arrival_lat = null, arrival_lng = null, arrival_acc = null,
     origin = v_origin,
     target_arrive = coalesce(public._arrive_target(r.building_code, r.priority, p_stage, v_origin), r.target_arrive),
     hold_kind = null, hold_at = null, hold_note = null, hold_ref = null, hold_eta = null,
     paused_arrive = 0, paused_work = 0, escalated_at = null
   where id = p_id;
end $$;

-- ------------------------------------------------------- phone notifications (sending)
-- Sending goes through the rasd-notify Edge Function, called by pg_net after the change is saved.
-- If notifications are not set up yet, or anything fails, requests are still saved normally.
do $$ begin
  create extension if not exists pg_net;
exception when others then raise notice 'pg_net is not available: %', sqlerrm;
end $$;

create or replace function public._push_text(p_kind text, r public.requests, p_lang text, st jsonb) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'title', case p_kind
      when 'new' then case when p_lang = 'en' then 'New request' || case when r.priority = 'urgent' then ' · Urgent' else '' end
                           else 'طلب جديد' || case when r.priority = 'urgent' then ' · عاجل' else '' end end
      when 'ops' then case when p_lang = 'en' then 'Sent to the operations room' || case when r.priority = 'urgent' then ' · Urgent' else '' end
                           else 'محوّل لغرفة العمليات' || case when r.priority = 'urgent' then ' · عاجل' else '' end end
      when 'assigned' then case when p_lang = 'en' then 'Job assigned to you' else 'أُسند إليك طلب' end
      when 'late' then case when p_lang = 'en' then 'Not picked up yet' else 'لم يُستلم بعد' end
      when 'hold' then case when p_lang = 'en' then 'Waiting for parts' else 'بانتظار قطع غيار' end
      when 'next' then case when p_lang = 'en' then 'Your next job: head there now' else 'مهمتك التالية: توجّه الآن' end
      else case when p_lang = 'en' then 'Rasd notifications are on' else 'إشعارات رصد تعمل' end end,
    'body', case when p_kind = 'test' or r.id is null
      then case when p_lang = 'en' then 'New requests will reach you here.' else 'ستصلك الطلبات الجديدة هنا.' end
      else '#' || r.no || ' · ' || case when p_lang = 'en' then r.unit_en || ' · ' || r.building_en else r.unit_ar || ' · ' || r.building_ar end
           || ' · ' || coalesce((select e->>(case when p_lang = 'en' then 'en' else 'ar' end) from jsonb_array_elements(st->'issueTypes') e
                                 where e->>'k' = r.issue_type limit 1), r.issue_type)
           || case when p_kind = 'late'
                then case when p_lang = 'en' then ' · waiting ' || floor(extract(epoch from now() - coalesce(r.offered_at, r.created_at)) / 60)::int || ' min'
                          else ' · منذ ' || floor(extract(epoch from now() - coalesce(r.offered_at, r.created_at)) / 60)::int || ' دقيقة' end
                when p_kind = 'hold' and r.hold_parts is not null then ' · ' || coalesce(public._parts_text(r.hold_parts), '')
                else '' end end,
    'url', case when p_kind = 'test' or r.id is null then './' else '#/r/' || r.id end,
    'tag', coalesce(r.id::text, 'rasd-test'),
    'lang', case when p_lang = 'en' then 'en' else 'ar' end,
    'dir', case when p_lang = 'en' then 'ltr' else 'rtl' end)
$$;

create or replace function public._push(p_staff uuid[], p_kind text, p_req uuid) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare cfg public.push_config; r public.requests; st jsonb; msgs jsonb;
begin
  select * into cfg from public.push_config where id = 1;
  if not found then return 0; end if;
  if p_req is not null then select * into r from public.requests where id = p_req; end if;
  select data into st from public.settings where id = 1;
  select coalesce(jsonb_agg(jsonb_build_object('subscription', ps.sub, 'payload', public._push_text(p_kind, r, ps.lang, st))), '[]'::jsonb)
    into msgs
    from public.push_subs ps join public.staff s on s.id = ps.staff_id
   where s.active and s.id = any (p_staff);
  if jsonb_array_length(msgs) = 0 then return 0; end if;
  perform net.http_post(url := cfg.fn_url,
    body := jsonb_build_object('vapid', jsonb_build_object('publicKey', cfg.public_key, 'privateKey', cfg.private_key, 'subject', cfg.subject),
                               'messages', msgs),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000);
  return jsonb_array_length(msgs);
exception when others then
  raise warning 'rasd notification skipped: %', sqlerrm;
  return 0;
end $$;

-- A finished, handed-over, paused or closed job frees its technician: the jobs he queued
-- behind it start their arrival timers now, measured from that building.
create or replace function public._release(p_ref uuid, p_building text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare q public.requests; v_no bigint;
begin
  select no into v_no from public.requests where id = p_ref;
  for q in select * from public.requests where hold_ref = p_ref and hold_kind = 'busy' and status = 'accepted' for update loop
    update public.requests set
        paused_arrive = paused_arrive + greatest(0, floor(extract(epoch from now() - hold_at)))::int,
        origin = p_building,
        target_arrive = coalesce(public._arrive_target(q.building_code, q.priority, q.stage, p_building), q.target_arrive),
        hold_kind = null, hold_at = null, hold_note = null, hold_ref = null, hold_eta = null
     where id = q.id;
    perform public._event(q.id, null, 'resumed_auto', '#' || v_no);
    perform public._push(array[q.technician_id], 'next', q.id);
  end loop;
end $$;

-- ------------------------------------------------------- creating requests
create or replace function public._insert_request(u public.units, p_issue text, p_pri text, p_description text, p_photo text,
  p_lang text, p_name text, p_phone text, p_source text, p_by uuid) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_t int[] := public._targets(u.building_code, p_pri); v_stage text := public._stage_for(u.building_code);
        v_code text := encode(gen_random_bytes(12), 'hex'); r public.requests;
begin
  insert into public.requests (unit_id, building_code, building_ar, building_en, unit_ar, unit_en, unit_kind,
      issue_type, priority, target_pickup, target_arrive, target_work, description, photo_before, lang,
      contact_name, contact_phone, tracking_code, source, created_by, stage, offered_at)
  values (u.id, u.building_code, u.building_ar, u.building_en, u.label_ar, u.label_en, u.kind,
      p_issue, p_pri, v_t[1], coalesce(public._arrive_target(u.building_code, p_pri, v_stage, null), 60), v_t[2],
      left(trim(p_description), 2000), p_photo, case when p_lang = 'en' then 'en' else 'ar' end,
      nullif(left(trim(coalesce(p_name, '')), 80), ''), nullif(left(trim(coalesce(p_phone, '')), 20), ''), v_code,
      p_source, p_by, v_stage, now())
  returning * into r;
  perform public._event(r.id, p_by, case when p_by is null then 'submitted' else 'logged' end, case when p_by is null then null else p_source end);
  return json_build_object('id', r.id, 'no', r.no, 'code', v_code, 'created_at', r.created_at, 'stage', r.stage);
end $$;

-- every new request goes to the team it starts with (the building's handyman or the operations room) and the desk
create or replace function public._on_request_new() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._push(public._team_ids(new.stage, new.building_code) || public._desk_ids(), 'new', new.id);
  return new;
end $$;
drop trigger if exists rasd_request_new on public.requests;
create trigger rasd_request_new after insert on public.requests for each row execute function public._on_request_new();

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
declare u public.units; v_pri text;
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
  return public._insert_request(u, p_issue, v_pri, p_description, p_photo, p_lang, p_name, p_phone, 'qr', null);
end $$;

create or replace function public.track_request(p_id uuid, p_code text) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'id', r.id, 'no', r.no, 'status', r.status, 'issue_type', r.issue_type, 'description', r.description,
    'building_code', r.building_code, 'building_ar', r.building_ar, 'building_en', r.building_en, 'unit_ar', r.unit_ar, 'unit_en', r.unit_en,
    'unit_kind', r.unit_kind, 'created_at', r.created_at, 'accepted_at', r.accepted_at, 'arrived_at', r.arrived_at,
    'finished_at', r.finished_at, 'closed_at', r.closed_at, 'cancelled_at', r.cancelled_at,
    'signed_at', r.signed_at, 'signoff_method', r.signoff_method, 'rating', r.rating, 'tech_note', r.tech_note,
    'parts', case when r.status in ('finished','closed') then r.parts end,
    'hold_kind', r.hold_kind, 'hold_eta', r.hold_eta, 'stage', r.stage,
    'escalated', exists (select 1 from jsonb_array_elements(r.legs) l where l->>'outcome' = 'escalated'),
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
  return json_build_object('id', me.id, 'name', me.full_name, 'role', me.role, 'phone', me.phone, 'team', me.team, 'sites', to_json(me.sites));
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
             r.issue_type, r.priority, r.target_pickup, r.target_arrive, r.target_work, left(r.description, 280) as description,
             r.lang, r.contact_name, r.contact_phone, r.status, r.created_at, r.technician_id,
             t.full_name as technician, r.accepted_at, r.accept_method, r.arrived_at, r.arrival_method,
             r.finished_at, r.signed_at, r.signoff_method, r.rating, r.closed_at, r.close_method, r.cancelled_at,
             r.source, r.stage, r.offered_at, r.origin, r.hold_kind, r.hold_at, r.hold_ref, r.hold_eta,
             (select b.no from public.requests b where b.id = r.hold_ref) as hold_ref_no,
             r.paused_arrive, r.paused_work, r.legs
        from public.requests r left join public.staff t on t.id = r.technician_id
       where public._sees(me, r)
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
  if me.role = 'technician' and not public._sees(me, r) then raise exception 'not_allowed'; end if;
  return (to_jsonb(r) - 'tracking_code'
          || jsonb_build_object(
               'technician', (select t.full_name from public.staff t where t.id = r.technician_id),
               'hold_ref_no', (select b.no from public.requests b where b.id = r.hold_ref),
               'created_by_name', (select t.full_name from public.staff t where t.id = r.created_by),
               'events', coalesce((select jsonb_agg(jsonb_build_object('at', e.at, 'ev', e.ev, 'note', e.note,
                                                    'actor', s.full_name) order by e.at, e.id)
                                     from public.events e left join public.staff s on s.id = e.actor
                                    where e.request_id = r.id), '[]'::jsonb)))::json;
end $$;

-- everything reported in a period, plus what was still open from before it (no photos)
create or replace function public.report_requests(p_token text, p_from timestamptz, p_to timestamptz) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return coalesce((
    select json_agg(x order by x.created_at) from (
      select r.id, r.no, r.unit_id, r.building_code, r.building_ar, r.building_en, r.unit_ar, r.unit_en, r.unit_kind,
             r.issue_type, r.priority, r.target_pickup, r.target_arrive, r.target_work, r.description, r.lang,
             r.contact_name, r.contact_phone, r.status, r.created_at, r.technician_id, t.full_name as technician,
             r.accepted_at, r.accept_method, r.arrived_at, r.arrival_method, r.finished_at, r.tech_note, r.parts,
             r.signed_at, r.signoff_method, r.signer_name, r.rating, r.rating_comment, r.closed_at, r.close_method, r.close_note,
             r.cancelled_at, r.cancel_note, r.source, r.stage, r.offered_at, r.origin, r.hold_kind, r.hold_at, r.hold_note,
             r.hold_ref, (select b.no from public.requests b where b.id = r.hold_ref) as hold_ref_no,
             r.hold_eta, r.hold_parts, r.paused_arrive, r.paused_work, r.legs
        from public.requests r left join public.staff t on t.id = r.technician_id
       where r.created_at < p_to
         and (r.created_at >= p_from
              or coalesce(r.closed_at, r.cancelled_at) is null
              or coalesce(r.closed_at, r.cancelled_at) >= p_from)
    ) x), '[]'::json);
end $$;

-- number of requests per day, week (from Sunday) or month, in Muscat time
create or replace function public.report_counts(p_token text, p_from timestamptz, p_to timestamptz,
  p_unit text default 'day', p_building text default null) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return coalesce((
    select json_agg(json_build_object('d', to_char(b, 'YYYY-MM-DD'), 'n', n, 'urgent', u, 'done', d, 'cancelled', c) order by b) from (
      select case p_unit when 'month' then date_trunc('month', l)
                         when 'week' then date_trunc('week', l + interval '1 day') - interval '1 day'
                         else date_trunc('day', l) end as b,
             count(*) as n, count(*) filter (where priority = 'urgent') as u,
             count(*) filter (where status in ('finished','closed')) as d,
             count(*) filter (where status = 'cancelled') as c
        from (select r.priority, r.status, r.created_at at time zone 'Asia/Muscat' as l from public.requests r
               where r.created_at >= p_from and r.created_at < p_to
                 and (p_building is null or p_building = '' or r.building_code = p_building)) q
       group by 1
    ) z), '[]'::json);
end $$;

-- ------------------------------------------------------ staff: actions
-- Accept a new request. A technician in the middle of another job accepts with p_busy (that job)
-- or p_note (work outside Rasd): his arrival timer waits until that job is done.
create or replace function public.tech_accept(p_token text, p_id uuid, p_busy uuid default null, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests; b public.requests; v_origin text;
        v_note text := nullif(left(trim(coalesce(p_note, '')), 300), ''); v_busy boolean;
begin
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'new' then raise exception 'already_taken'; end if;
  if me.role = 'technician' and not public._sees(me, r) then raise exception 'not_allowed'; end if;
  if p_busy is not null then
    select * into b from public.requests where id = p_busy and technician_id = me.id and status in ('accepted','onsite');
    if not found then raise exception 'bad_busy'; end if;
  elsif p_note is not null and coalesce(length(v_note), 0) < 3 then raise exception 'reason_required';
  end if;
  v_busy := p_busy is not null or v_note is not null;
  v_origin := case when p_busy is not null then b.building_code else public._where(me.id) end;
  update public.requests
     set status = 'accepted', technician_id = me.id, accepted_at = now(), accept_method = 'self', origin = v_origin,
         target_arrive = coalesce(public._arrive_target(building_code, priority, stage, v_origin), target_arrive),
         hold_kind = case when v_busy then 'busy' end, hold_at = case when v_busy then now() end,
         hold_ref = p_busy, hold_note = case when p_busy is null then v_note end
   where id = p_id;
  perform public._event(p_id, me.id, 'accepted');
  if v_busy then perform public._event(p_id, me.id, 'hold_busy', coalesce('#' || b.no, v_note)); end if;
end $$;

-- Pause a job: busy with another job or tenant unavailable (before arrival); waiting for parts,
-- tenant unavailable or another reason (after arrival). Paused time is not counted.
create or replace function public.tech_hold(p_token text, p_id uuid, p_kind text, p_note text default null,
  p_ref uuid default null, p_eta timestamptz default null, p_parts jsonb default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests; b public.requests; v_parts jsonb;
        v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  select * into r from public.requests where id = p_id for update;
  if not found or r.status not in ('accepted','onsite') or r.hold_kind is not null then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  if p_kind = 'busy' then
    if r.status <> 'accepted' then raise exception 'not_ready'; end if;
    if p_ref is not null then
      select * into b from public.requests where id = p_ref and id <> p_id and technician_id = r.technician_id and status in ('accepted','onsite');
      if not found then raise exception 'bad_busy'; end if;
    elsif coalesce(length(v_note), 0) < 3 then raise exception 'reason_required';
    end if;
  elsif p_kind = 'access' then
    if coalesce(length(v_note), 0) < 3 then raise exception 'reason_required'; end if;
  elsif p_kind = 'parts' then
    if r.status <> 'onsite' then raise exception 'not_ready'; end if;
    v_parts := public._clean_parts(p_parts);
    if jsonb_array_length(v_parts) = 0 then raise exception 'parts_required'; end if;
  elsif p_kind = 'other' then
    if r.status <> 'onsite' then raise exception 'not_ready'; end if;
    if coalesce(length(v_note), 0) < 3 then raise exception 'reason_required'; end if;
  else raise exception 'bad_kind';
  end if;
  update public.requests
     set hold_kind = p_kind, hold_at = now(), hold_note = v_note,
         hold_ref = case when p_kind = 'busy' then p_ref end,
         hold_eta = case when p_kind in ('parts','access','other') then p_eta end,
         hold_parts = case when p_kind = 'parts' then v_parts else hold_parts end
   where id = p_id;
  perform public._event(p_id, me.id, 'hold_' || p_kind,
    concat_ws(' · ', case when p_kind = 'busy' and p_ref is not null then '#' || b.no end, v_note,
              case when p_kind = 'parts' then public._parts_text(v_parts) end));
  if r.status = 'onsite' then perform public._release(p_id, r.building_code); end if;
  if p_kind = 'parts' then perform public._push(public._desk_ids(true), 'hold', p_id); end if;
end $$;

-- Resume a paused job. Before arrival: the arrival timer runs again. After arrival: the technician
-- is back on site, so he scans the location code again (or gives a reason).
create or replace function public.tech_resume(p_token text, p_id uuid, p_unit_token text default null, p_note text default null) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests; v_token text; v_method text; v_secs int; v_origin text;
begin
  select * into r from public.requests where id = p_id for update;
  if not found or r.hold_kind is null or r.status not in ('accepted','onsite') then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  v_secs := greatest(0, floor(extract(epoch from now() - r.hold_at)))::int;
  if r.status = 'accepted' then
    v_origin := public._where(r.technician_id);
    update public.requests
       set paused_arrive = paused_arrive + v_secs, origin = v_origin,
           target_arrive = coalesce(public._arrive_target(building_code, priority, stage, v_origin), target_arrive),
           hold_kind = null, hold_at = null, hold_note = null, hold_ref = null, hold_eta = null
     where id = p_id;
    perform public._event(p_id, me.id, 'resumed');
    return 'go';
  end if;
  select token into v_token from public.units where id = r.unit_id;
  if nullif(trim(coalesce(p_unit_token, '')), '') is not null then
    if trim(p_unit_token) <> v_token then raise exception 'wrong_unit'; end if;
    v_method := 'qr';
  else
    if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
    v_method := 'manual';
  end if;
  update public.requests
     set paused_work = paused_work + v_secs,
         hold_kind = null, hold_at = null, hold_note = null, hold_ref = null, hold_eta = null
   where id = p_id;
  perform public._event(p_id, me.id, 'resumed_' || v_method, left(p_note, 300));
  return v_method;
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
  if r.hold_kind is not null then raise exception 'on_hold'; end if;
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

-- Finish: photo after the repair, the technician's report and the parts he replaced.
create or replace function public.tech_finish(p_token text, p_id uuid, p_photo text, p_note text default null,
  p_parts jsonb default '[]'::jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests;
begin
  if coalesce(p_photo, '') !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) < 1000 then raise exception 'photo_required'; end if;
  if length(p_photo) > 1500000 then raise exception 'photo_too_large'; end if;
  if coalesce(length(trim(p_note)), 0) < 5 then raise exception 'report_required'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'onsite' or r.hold_kind is not null then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  update public.requests set status = 'finished', finished_at = now(), photo_after = p_photo,
         tech_note = left(trim(p_note), 1500), parts = public._clean_parts(p_parts)
   where id = p_id;
  perform public._event(p_id, me.id, 'finished', left(trim(p_note), 500));
  perform public._release(p_id, r.building_code);
end $$;

-- The handyman inspected the job and hands it to the operations room.
create or replace function public.tech_escalate(p_token text, p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token); r public.requests; v_note text := left(trim(coalesce(p_note, '')), 500);
begin
  if length(v_note) < 3 then raise exception 'reason_required'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'onsite' or r.stage <> 'hm' then raise exception 'not_ready'; end if;
  if r.technician_id is distinct from me.id and me.role = 'technician' then raise exception 'not_assigned'; end if;
  perform public._handover(p_id, 'escalated', v_note, null, 'ops');
  perform public._event(p_id, me.id, 'to_ops', v_note);
  perform public._release(p_id, r.building_code);
  perform public._push(public._team_ids('ops', r.building_code) || public._desk_ids(), 'ops', p_id);
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
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests; s public.staff;
        v_stage text; v_origin text;
begin
  select * into s from public.staff where id = p_staff and active and role = 'technician';
  if not found then raise exception 'bad_technician'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status not in ('new','accepted','onsite') then raise exception 'not_ready'; end if;
  if r.technician_id = p_staff then return; end if;
  v_stage := case when s.team = 'hm' then 'hm' else 'ops' end;
  if r.status = 'new' then
    v_origin := public._where(p_staff);
    update public.requests
       set status = 'accepted', technician_id = p_staff, accepted_at = now(), accept_method = 'assigned',
           stage = v_stage, origin = v_origin,
           target_arrive = coalesce(public._arrive_target(building_code, priority, v_stage, v_origin), target_arrive)
     where id = p_id;
    perform public._event(p_id, me.id, 'assigned', s.full_name);
  else
    perform public._handover(p_id, 'reassigned', s.full_name, p_staff, v_stage);
    perform public._event(p_id, me.id, 'reassigned', s.full_name);
    perform public._release(p_id, r.building_code);
  end if;
  perform public._push(array[p_staff], 'assigned', p_id);
end $$;

-- move a request that nobody has taken yet between the building handyman and the operations room
create or replace function public.mgr_stage(p_token text, p_id uuid, p_stage text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests;
begin
  if p_stage not in ('hm','ops') then raise exception 'bad_stage'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status <> 'new' then raise exception 'not_ready'; end if;
  if r.stage = p_stage then return; end if;
  update public.requests
     set stage = p_stage, offered_at = now(), escalated_at = null,
         target_arrive = coalesce(public._arrive_target(building_code, priority, p_stage, null), target_arrive)
   where id = p_id;
  perform public._event(p_id, me.id, case when p_stage = 'ops' then 'sent_ops' else 'sent_hm' end);
  perform public._push(public._team_ids(p_stage, r.building_code), case when p_stage = 'ops' then 'ops' else 'new' end, p_id);
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
  update public.requests
     set priority = p_priority, target_pickup = v_t[1], target_work = v_t[2],
         target_arrive = case when arrived_at is null
                              then coalesce(public._arrive_target(building_code, p_priority, stage, origin), target_arrive)
                              else target_arrive end
   where id = p_id;
  perform public._event(p_id, me.id, 'priority_' || p_priority);
end $$;

create or replace function public.mgr_close(p_token text, p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests;
begin
  if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status not in ('accepted','onsite','finished') then raise exception 'not_ready'; end if;
  update public.requests
     set status = 'closed', closed_at = now(), close_method = 'manual', close_note = left(trim(p_note), 500),
         paused_arrive = paused_arrive + case when hold_kind is not null and arrived_at is null
                                              then greatest(0, floor(extract(epoch from now() - hold_at)))::int else 0 end,
         paused_work = paused_work + case when hold_kind is not null and arrived_at is not null
                                          then greatest(0, floor(extract(epoch from now() - hold_at)))::int else 0 end,
         hold_kind = null, hold_at = null, hold_ref = null, hold_eta = null
   where id = p_id;
  perform public._event(p_id, me.id, 'closed_manual', left(trim(p_note), 500));
  perform public._release(p_id, r.building_code);
end $$;

create or replace function public.mgr_cancel(p_token text, p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); r public.requests;
begin
  if coalesce(length(trim(p_note)), 0) < 3 then raise exception 'reason_required'; end if;
  select * into r from public.requests where id = p_id for update;
  if not found or r.status in ('closed','cancelled') then raise exception 'not_ready'; end if;
  update public.requests
     set status = 'cancelled', cancelled_at = now(), cancel_note = left(trim(p_note), 500),
         hold_kind = null, hold_at = null, hold_ref = null, hold_eta = null
   where id = p_id;
  perform public._event(p_id, me.id, 'cancelled', left(trim(p_note), 500));
  perform public._release(p_id, r.building_code);
end $$;

-- the desk logs a request reported by phone, WhatsApp or in person (photo optional)
create or replace function public.mgr_create_request(p_token text, p_unit uuid, p_issue text, p_description text,
  p_photo text default null, p_name text default null, p_phone text default null, p_source text default 'phone',
  p_lang text default 'ar') returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']); u public.units; v_pri text;
        v_photo text := nullif(p_photo, '');
begin
  select * into u from public.units where id = p_unit and active;
  if not found then raise exception 'invalid_unit'; end if;
  select e->>'p' into v_pri
    from public.settings s, jsonb_array_elements(s.data->'issueTypes') e
   where s.id = 1 and e->>'k' = p_issue limit 1;
  if v_pri is null then raise exception 'issue_required'; end if;
  if coalesce(length(trim(p_description)), 0) < 3 then raise exception 'description_required'; end if;
  if v_photo is not null and (v_photo !~ '^data:image/(jpeg|png|webp);base64,' or length(v_photo) < 1000) then raise exception 'photo_required'; end if;
  if length(coalesce(v_photo, '')) > 1500000 then raise exception 'photo_too_large'; end if;
  return public._insert_request(u, p_issue, v_pri, p_description, v_photo, p_lang, p_name, p_phone,
    case when p_source in ('phone','whatsapp','walkin','email') then p_source else 'other' end, me.id);
end $$;

create or replace function public.team_list(p_token text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return coalesce((select json_agg(json_build_object('id', s.id, 'name', s.full_name, 'phone', s.phone, 'role', s.role,
                     'team', s.team, 'sites', to_json(s.sites),
                     'active', s.active, 'locked', coalesce(s.locked_until > now(), false), 'created_at', s.created_at,
                     'push', exists (select 1 from public.push_subs ps where ps.staff_id = s.id))
                     order by s.active desc, s.role, s.team, s.full_name)
                   from public.staff s), '[]'::json);
end $$;

create or replace function public.admin_save_staff(p_token text, p_id uuid, p_name text, p_phone text, p_role text,
  p_active boolean default true, p_pin text default null, p_team text default 'ops', p_sites jsonb default '[]'::jsonb) returns json
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']); v_id uuid; v_phone text := public._norm_phone(p_phone);
        v_team text := case when p_team = 'hm' and p_role = 'technician' then 'hm' else 'ops' end; v_sites text[];
begin
  if coalesce(length(trim(p_name)), 0) < 2 then raise exception 'name_required'; end if;
  if length(v_phone) < 8 then raise exception 'phone_required'; end if;
  if p_role not in ('technician','supervisor','admin') then raise exception 'bad_role'; end if;
  if nullif(p_pin, '') is not null and p_pin !~ '^[0-9]{6}$' then raise exception 'pin_format'; end if;
  if exists (select 1 from public.staff where phone = v_phone and id is distinct from p_id) then raise exception 'phone_taken'; end if;
  v_sites := case when v_team = 'hm' then coalesce((select array_agg(distinct upper(trim(x)))
                     from jsonb_array_elements_text(case when jsonb_typeof(p_sites) = 'array' then p_sites else '[]'::jsonb end) x
                    where trim(x) ~ '^[A-Za-z0-9]{2,8}$'), '{}') else '{}' end;
  if v_team = 'hm' and cardinality(v_sites) = 0 then raise exception 'sites_required'; end if;
  if p_id is null then
    if nullif(p_pin, '') is null then raise exception 'pin_format'; end if;
    insert into public.staff (full_name, phone, role, pin_hash, active, team, sites)
    values (left(trim(p_name), 80), v_phone, p_role, crypt(p_pin, gen_salt('bf', 8)), coalesce(p_active, true), v_team, v_sites)
    returning id into v_id;
  else
    if p_id = me.id and (p_role <> 'admin' or not coalesce(p_active, true)) then raise exception 'not_self'; end if;
    update public.staff
       set full_name = left(trim(p_name), 80), phone = v_phone, role = p_role, active = coalesce(p_active, true),
           team = v_team, sites = v_sites,
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
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return coalesce((select json_agg(json_build_object('id', u.id, 'building_code', u.building_code,
                     'building_ar', u.building_ar, 'building_en', u.building_en, 'label_ar', u.label_ar,
                     'label_en', u.label_en, 'kind', u.kind, 'token', case when me.role = 'admin' then u.token end,
                     'active', u.active, 'sort', u.sort)
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
  -- a new building also appears in Settings, as residential with a one-hour travel time until edited
  update public.settings
     set data = jsonb_set(case when jsonb_typeof(data->'buildings') = 'object' then data else data || '{"buildings": {}}'::jsonb end,
                          array['buildings', v_code],
                          jsonb_build_object('ar', trim(p_building_ar), 'en', trim(p_building_en), 'type', 'res', 'ops', 60, 'sort', 50), true),
         updated_at = now()
   where id = 1 and data #> array['buildings', v_code] is null;
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
                    or coalesce(e->>'ar', '') = '' or coalesce(e->>'en', '') = '')
     or (p_data ? 'buildings' and jsonb_typeof(p_data->'buildings') <> 'object')
     or exists (select 1 from jsonb_each(coalesce(p_data->'buildings', '{}'::jsonb)) b
                 where jsonb_typeof(b.value) <> 'object'
                    or (b.value ? 'ops' and jsonb_typeof(b.value->'ops') not in ('number','null'))
                    or coalesce(b.value->>'type', 'res') not in ('res','com')) then
    raise exception 'bad_settings';
  end if;
  insert into public.settings (id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

-- -------------------------------------------------- reminders and notification set-up
-- a request nobody accepted within its pickup target alerts the supervisor and the admin once
create or replace function public._escalate() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare q record; n int := 0; st jsonb;
begin
  select data into st from public.settings where id = 1;
  for q in
    select r.id from public.requests r
     where r.status = 'new' and r.escalated_at is null
       and coalesce(r.offered_at, r.created_at) < now() - make_interval(mins => coalesce(r.target_pickup,
             nullif(st #>> array['targets', r.priority, 'pickup'], '')::int, case when r.priority = 'urgent' then 15 else 60 end))
  loop
    update public.requests set escalated_at = now() where id = q.id;
    perform public._event(q.id, null, 'escalated');
    perform public._push(public._desk_ids(), 'late', q.id);
    n := n + 1;
  end loop;
  return n;
end $$;

do $$ begin
  create extension if not exists pg_cron;
exception when others then raise notice 'pg_cron is not available: %', sqlerrm;
end $$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('rasd-escalate', '*/5 * * * *', 'select public._escalate()');
  end if;
exception when others then raise notice 'reminder schedule skipped: %', sqlerrm;
end $$;

create or replace function public.push_public_key() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select public_key from public.push_config where id = 1
$$;

create or replace function public.push_subscribe(p_token text, p_sub jsonb, p_lang text default 'ar') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or coalesce(p_sub #>> '{keys,p256dh}', '') = '' or coalesce(p_sub #>> '{keys,auth}', '') = '' then
    raise exception 'bad_subscription';
  end if;
  insert into public.push_subs (endpoint, staff_id, sub, lang)
  values (p_sub->>'endpoint', me.id, jsonb_build_object('endpoint', p_sub->>'endpoint', 'keys', p_sub->'keys'),
          case when p_lang = 'en' then 'en' else 'ar' end)
  on conflict (endpoint) do update set staff_id = excluded.staff_id, sub = excluded.sub, lang = excluded.lang, created_at = now();
end $$;

create or replace function public.push_unsubscribe(p_token text, p_endpoint text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  delete from public.push_subs where endpoint = p_endpoint and staff_id = me.id;
end $$;

create or replace function public.push_test(p_token text) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token);
begin
  return public._push(array[me.id], 'test', null);
end $$;

create or replace function public.push_gone(p_endpoints text[]) returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from public.push_subs where endpoint = any (p_endpoints)
$$;

create or replace function public.admin_set_push(p_token text, p_public text, p_private text, p_subject text, p_fn_url text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['admin']); v_old text;
begin
  if coalesce(p_public, '') !~ '^[A-Za-z0-9_-]{80,100}$' or coalesce(p_private, '') !~ '^[A-Za-z0-9_-]{40,50}$' then raise exception 'bad_keys'; end if;
  if coalesce(p_fn_url, '') !~ '^https://' or coalesce(p_subject, '') !~ '^(https://|mailto:)' then raise exception 'bad_keys'; end if;
  select public_key into v_old from public.push_config where id = 1;
  insert into public.push_config (id, public_key, private_key, subject, fn_url, updated_at)
  values (1, p_public, p_private, p_subject, p_fn_url, now())
  on conflict (id) do update set public_key = excluded.public_key, private_key = excluded.private_key,
                                 subject = excluded.subject, fn_url = excluded.fn_url, updated_at = now();
  if v_old is distinct from p_public then delete from public.push_subs; end if;
end $$;

create or replace function public.admin_push_status(p_token text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.staff := public._auth(p_token, array['supervisor','admin']);
begin
  return json_build_object(
    'configured', exists (select 1 from public.push_config where id = 1),
    'fn_url', (select fn_url from public.push_config where id = 1),
    'phones', (select count(*) from public.push_subs),
    'people', (select count(distinct staff_id) from public.push_subs),
    'sender', exists (select 1 from pg_extension where extname = 'pg_net'),
    'reminders', exists (select 1 from pg_extension where extname = 'pg_cron'));
end $$;

-- ------------------------------------------------------ who may call what
revoke all on function public._norm_phone(text), public._auth(text, text[]), public._new_session(uuid),
  public._targets(text, text), public._arrive_target(text, text, text, text), public._stage_for(text),
  public._team_ids(text, text), public._desk_ids(boolean), public._sees(public.staff, public.requests), public._where(uuid),
  public._event(uuid, uuid, text, text), public._clean_parts(jsonb), public._parts_text(jsonb),
  public._leg(public.requests, text, text), public._handover(uuid, text, text, uuid, text), public._release(uuid, text),
  public._insert_request(public.units, text, text, text, text, text, text, text, text, uuid),
  public._push(uuid[], text, uuid), public._push_text(text, public.requests, text, jsonb), public._on_request_new(), public._escalate()
  from public, anon, authenticated;

revoke all on function
  public.get_settings(), public.unit_info(text), public.submit_request(text,text,text,text,text,text,text),
  public.track_request(uuid,text), public.tenant_signoff(uuid,text,text,int,text),
  public.setup_status(), public.setup_admin(text,text,text), public.staff_login(text,text),
  public.staff_logout(text), public.staff_me(text), public.staff_requests(text,timestamptz,timestamptz),
  public.staff_request(text,uuid), public.report_requests(text,timestamptz,timestamptz),
  public.report_counts(text,timestamptz,timestamptz,text,text),
  public.tech_accept(text,uuid,uuid,text), public.tech_hold(text,uuid,text,text,uuid,timestamptz,jsonb),
  public.tech_resume(text,uuid,text,text),
  public.tech_arrive(text,uuid,text,text,double precision,double precision,double precision),
  public.tech_finish(text,uuid,text,text,jsonb), public.tech_escalate(text,uuid,text),
  public.onsite_signoff(text,uuid,text,text,int,text),
  public.mgr_assign(text,uuid,uuid), public.mgr_stage(text,uuid,text), public.mgr_priority(text,uuid,text),
  public.mgr_close(text,uuid,text), public.mgr_cancel(text,uuid,text),
  public.mgr_create_request(text,uuid,text,text,text,text,text,text,text), public.team_list(text),
  public.admin_save_staff(text,uuid,text,text,text,boolean,text,text,jsonb), public.admin_units(text),
  public.admin_add_unit(text,text,text,text,text,text,text,int), public.admin_unit_active(text,uuid,boolean),
  public.admin_save_settings(text,jsonb),
  public.push_public_key(), public.push_subscribe(text, jsonb, text), public.push_unsubscribe(text, text),
  public.push_test(text), public.push_gone(text[]), public.admin_set_push(text, text, text, text, text), public.admin_push_status(text)
  from public;

grant execute on function
  public.get_settings(), public.unit_info(text), public.submit_request(text,text,text,text,text,text,text),
  public.track_request(uuid,text), public.tenant_signoff(uuid,text,text,int,text),
  public.setup_status(), public.setup_admin(text,text,text), public.staff_login(text,text),
  public.staff_logout(text), public.staff_me(text), public.staff_requests(text,timestamptz,timestamptz),
  public.staff_request(text,uuid), public.report_requests(text,timestamptz,timestamptz),
  public.report_counts(text,timestamptz,timestamptz,text,text),
  public.tech_accept(text,uuid,uuid,text), public.tech_hold(text,uuid,text,text,uuid,timestamptz,jsonb),
  public.tech_resume(text,uuid,text,text),
  public.tech_arrive(text,uuid,text,text,double precision,double precision,double precision),
  public.tech_finish(text,uuid,text,text,jsonb), public.tech_escalate(text,uuid,text),
  public.onsite_signoff(text,uuid,text,text,int,text),
  public.mgr_assign(text,uuid,uuid), public.mgr_stage(text,uuid,text), public.mgr_priority(text,uuid,text),
  public.mgr_close(text,uuid,text), public.mgr_cancel(text,uuid,text),
  public.mgr_create_request(text,uuid,text,text,text,text,text,text,text), public.team_list(text),
  public.admin_save_staff(text,uuid,text,text,text,boolean,text,text,jsonb), public.admin_units(text),
  public.admin_add_unit(text,text,text,text,text,text,text,int), public.admin_unit_active(text,uuid,boolean),
  public.admin_save_settings(text,jsonb),
  public.push_public_key(), public.push_subscribe(text, jsonb, text), public.push_unsubscribe(text, text),
  public.push_test(text), public.push_gone(text[]), public.admin_set_push(text, text, text, text, text), public.admin_push_status(text)
  to anon, authenticated;

-- ------------------------------------------------------------- first data
insert into public.settings (id, data) values (1, $json${"v":2,"contractor":{"ar":"الطاؤوس","en":"Tawoos"},"targets":{"urgent":{"pickup":15,"arrive":15,"work":120},"normal":{"pickup":60,"arrive":60,"work":240}},"buildings":{"AZB":{"ar":"مبنى العذيبة","en":"Azaiba Building","type":"res","ops":30,"sort":1,"lat":null,"lng":null},"SAY":{"ar":"مبنى السيب","en":"Seeb Building","type":"res","ops":120,"sort":2,"lat":null,"lng":null},"MWL":{"ar":"مبنى الموالح","en":"Mawaleh Building","type":"res","ops":90,"sort":3,"lat":null,"lng":null},"BSH":{"ar":"مبنى بوشر","en":"Bousher Building","type":"res","ops":60,"sort":4,"lat":null,"lng":null},"HO":{"ar":"المكتب الرئيسي","en":"Head Office","type":"com","ops":30,"sort":5,"lat":null,"lng":null},"SCC":{"ar":"سابكو سنتر","en":"SABCO Centre","type":"com","ops":30,"sort":6,"lat":null,"lng":null},"OBTS":{"ar":"الواحة على الشاطئ","en":"Oasis by the Sea","type":"com","ops":30,"sort":7,"lat":null,"lng":null}},"repeatDays":30,"issueTypes":[{"k":"water_leak","p":"urgent","ar":"تسرّب مياه أو فيضان","en":"Water leak or flooding"},{"k":"no_power","p":"urgent","ar":"انقطاع الكهرباء","en":"Power outage"},{"k":"sparks","p":"urgent","ar":"شرارة أو رائحة احتراق","en":"Sparks or burning smell"},{"k":"no_water","p":"urgent","ar":"انقطاع المياه","en":"No water supply"},{"k":"drain_overflow","p":"urgent","ar":"انسداد أو طفح المجاري","en":"Blocked or overflowing drain"},{"k":"door_lock","p":"urgent","ar":"باب لا يُقفل","en":"Door will not lock"},{"k":"lift","p":"urgent","ar":"المصعد متوقف أو عالق","en":"Lift stopped or stuck"},{"k":"ac","p":"normal","ar":"المكيف لا يعمل أو لا يبرّد","en":"AC not working or not cooling"},{"k":"lights","p":"normal","ar":"إنارة لا تعمل","en":"Lights not working"},{"k":"sockets","p":"normal","ar":"أفياش أو مفاتيح كهرباء","en":"Sockets or switches"},{"k":"heater","p":"normal","ar":"سخان الماء","en":"Water heater"},{"k":"plumbing","p":"normal","ar":"حنفية أو سيفون أو شطاف","en":"Tap, toilet flush or hand spray"},{"k":"carpentry","p":"normal","ar":"أبواب أو نوافذ أو خزائن","en":"Doors, windows or cupboards"},{"k":"pests","p":"normal","ar":"حشرات","en":"Pests"},{"k":"other","p":"normal","ar":"أخرى","en":"Other"}]}$json$::jsonb)
on conflict (id) do nothing;

-- upgrading from the first version: add the buildings and team targets, keep everything already edited
update public.settings s
   set data = jsonb_set(jsonb_set(s.data || '{"v": 2}'::jsonb, '{buildings}',
         coalesce((select jsonb_object_agg(k, coalesce(d.def->'buildings'->k, '{}'::jsonb) || coalesce(s.data->'buildings'->k, '{}'::jsonb))
                     from jsonb_object_keys(coalesce(d.def->'buildings', '{}'::jsonb) || coalesce(s.data->'buildings', '{}'::jsonb)) k), '{}'::jsonb)),
         '{targets}', case when s.data->'targets' = $json${"urgent":{"pickup":15,"arrive":60,"work":120},"normal":{"pickup":60,"arrive":240,"work":240}}$json$::jsonb then d.def->'targets' else coalesce(s.data->'targets', d.def->'targets') end),
       updated_at = now()
  from (select $json${"v":2,"contractor":{"ar":"الطاؤوس","en":"Tawoos"},"targets":{"urgent":{"pickup":15,"arrive":15,"work":120},"normal":{"pickup":60,"arrive":60,"work":240}},"buildings":{"AZB":{"ar":"مبنى العذيبة","en":"Azaiba Building","type":"res","ops":30,"sort":1,"lat":null,"lng":null},"SAY":{"ar":"مبنى السيب","en":"Seeb Building","type":"res","ops":120,"sort":2,"lat":null,"lng":null},"MWL":{"ar":"مبنى الموالح","en":"Mawaleh Building","type":"res","ops":90,"sort":3,"lat":null,"lng":null},"BSH":{"ar":"مبنى بوشر","en":"Bousher Building","type":"res","ops":60,"sort":4,"lat":null,"lng":null},"HO":{"ar":"المكتب الرئيسي","en":"Head Office","type":"com","ops":30,"sort":5,"lat":null,"lng":null},"SCC":{"ar":"سابكو سنتر","en":"SABCO Centre","type":"com","ops":30,"sort":6,"lat":null,"lng":null},"OBTS":{"ar":"الواحة على الشاطئ","en":"Oasis by the Sea","type":"com","ops":30,"sort":7,"lat":null,"lng":null}},"repeatDays":30,"issueTypes":[{"k":"water_leak","p":"urgent","ar":"تسرّب مياه أو فيضان","en":"Water leak or flooding"},{"k":"no_power","p":"urgent","ar":"انقطاع الكهرباء","en":"Power outage"},{"k":"sparks","p":"urgent","ar":"شرارة أو رائحة احتراق","en":"Sparks or burning smell"},{"k":"no_water","p":"urgent","ar":"انقطاع المياه","en":"No water supply"},{"k":"drain_overflow","p":"urgent","ar":"انسداد أو طفح المجاري","en":"Blocked or overflowing drain"},{"k":"door_lock","p":"urgent","ar":"باب لا يُقفل","en":"Door will not lock"},{"k":"lift","p":"urgent","ar":"المصعد متوقف أو عالق","en":"Lift stopped or stuck"},{"k":"ac","p":"normal","ar":"المكيف لا يعمل أو لا يبرّد","en":"AC not working or not cooling"},{"k":"lights","p":"normal","ar":"إنارة لا تعمل","en":"Lights not working"},{"k":"sockets","p":"normal","ar":"أفياش أو مفاتيح كهرباء","en":"Sockets or switches"},{"k":"heater","p":"normal","ar":"سخان الماء","en":"Water heater"},{"k":"plumbing","p":"normal","ar":"حنفية أو سيفون أو شطاف","en":"Tap, toilet flush or hand spray"},{"k":"carpentry","p":"normal","ar":"أبواب أو نوافذ أو خزائن","en":"Doors, windows or cupboards"},{"k":"pests","p":"normal","ar":"حشرات","en":"Pests"},{"k":"other","p":"normal","ar":"أخرى","en":"Other"}]}$json$::jsonb as def) d
 where s.id = 1 and coalesce(s.data->>'v', '1') = '1';

-- مبنى العذيبة (25)، مبنى السيب (1)، مبنى الموالح (1)، مبنى بوشر (1)، المكتب الرئيسي (1)، سابكو سنتر (1)، الواحة على الشاطئ (1) — QR codes (do not change the tokens: they are printed on the labels)
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
  ('AZB', 'مبنى العذيبة', 'Azaiba Building', 'المنطقة العامة', 'Common area', 'common', 'azbc-b8xswv', 100),
  ('SAY', 'مبنى السيب', 'Seeb Building', 'المنطقة العامة', 'Common area', 'common', 'sayc-a5s5va', 100),
  ('MWL', 'مبنى الموالح', 'Mawaleh Building', 'المنطقة العامة', 'Common area', 'common', 'mwlc-25ss5i', 100),
  ('BSH', 'مبنى بوشر', 'Bousher Building', 'المنطقة العامة', 'Common area', 'common', 'bshc-9arcwu', 100),
  ('HO', 'المكتب الرئيسي', 'Head Office', 'المنطقة العامة', 'Common area', 'common', 'hoc-jxu2ur', 100),
  ('SCC', 'سابكو سنتر', 'SABCO Centre', 'المنطقة العامة', 'Common area', 'common', 'sccc-2b2ze8', 100),
  ('OBTS', 'الواحة على الشاطئ', 'Oasis by the Sea', 'المنطقة العامة', 'Common area', 'common', 'obtsc-tz7gxn', 100)
on conflict (token) do nothing;

notify pgrst, 'reload schema';

select 'رصد جاهز · Rasd is ready (v2)' as result;
