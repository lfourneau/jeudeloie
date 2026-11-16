-- Devine la question : schéma, RLS et fonctions transactionnelles.
-- Le client ne fait que lire (sous RLS). Toutes les écritures passent par les Edge Functions,
-- qui appellent les fonctions SQL ci-dessous avec la clé service.

-- ---------- Tables ----------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{4}$'),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  seat smallint not null check (seat in (0, 1)),
  created_at timestamptz not null default now(),
  unique (room_id, seat),
  unique (room_id, user_id)
);
create index players_user_idx on public.players(user_id);

create table public.game_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  phase text not null default 'lobby'
    check (phase in ('lobby', 'answering', 'guessing', 'judging', 'reveal', 'appeal', 'spin', 'moving', 'finished')),
  turn_number int not null default 0,
  turns_counted int not null default 0,
  answerer_seat smallint not null default 0 check (answerer_seat in (0, 1)),
  position int not null default 0 check (position between 0 and 40),
  inventory jsonb not null default '[]'::jsonb,
  appeal_used boolean not null default false,
  next_wheel_override smallint,
  shield_active boolean not null default false,
  current_round_id uuid,
  outcome text check (outcome in ('win', 'lose')),
  version int not null default 0, -- verrou optimiste : chaque écriture l'incrémente
  updated_at timestamptz not null default now()
);

create table public.rounds (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  turn_number int not null,
  case_index int not null,
  media text not null check (media in ('mot', 'nombre', 'emojis', 'dessin', 'photo')),
  answerer_seat smallint not null check (answerer_seat in (0, 1)),
  answer_text text,
  answer_media_path text,
  guess_text text,
  llm_score smallint check (llm_score between 0 and 5),
  llm_comment text,
  judge_failed boolean not null default false,
  heart boolean not null default false,
  appeal_scores jsonb not null default '{}'::jsonb,
  appeal_manual boolean not null default false,
  final_score numeric(2, 1),
  wheel_level smallint,
  wheel_index smallint,
  wheel_result smallint,
  position_after int,
  revealed boolean not null default false,
  continue_votes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (room_id, turn_number)
);
create index rounds_room_idx on public.rounds(room_id);

-- Question secrète à part : la RLS la cache au devineur jusqu'à la révélation.
-- question_id vit ici (et non dans rounds) : le dépôt étant public, l'id suffirait à retrouver la question.
create table public.round_secrets (
  round_id uuid primary key references public.rounds(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  theme text not null,
  answerer_user_id uuid not null references auth.users(id) on delete cascade
);

-- ---------- RLS ----------

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.game_state enable row level security;
alter table public.rounds enable row level security;
alter table public.round_secrets enable row level security;

-- security definer pour éviter la récursion de la RLS sur players
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.players where room_id = p_room_id and user_id = auth.uid());
$$;

create policy "membres lisent la salle" on public.rooms
  for select to authenticated using (public.is_room_member(id));
create policy "membres lisent les joueurs" on public.players
  for select to authenticated using (public.is_room_member(room_id));
create policy "membres lisent l'état" on public.game_state
  for select to authenticated using (public.is_room_member(room_id));
create policy "membres lisent les tours" on public.rounds
  for select to authenticated using (public.is_room_member(room_id));
create policy "répondant ou tour révélé" on public.round_secrets
  for select to authenticated using (
    answerer_user_id = auth.uid()
    or exists (
      select 1 from public.rounds r
      where r.id = round_id and r.revealed and public.is_room_member(r.room_id)
    )
  );

-- Aucune écriture depuis le client, même si une politique était ajoutée par erreur.
revoke insert, update, delete, truncate on public.rooms, public.players, public.game_state, public.rounds, public.round_secrets from anon, authenticated;
revoke all on public.round_secrets from anon;
grant select on public.rooms, public.players, public.game_state, public.rounds, public.round_secrets to authenticated;

-- ---------- Realtime ----------
-- round_secrets n'est volontairement pas publiée.
alter publication supabase_realtime add table public.game_state, public.rounds, public.players;

-- ---------- Fonctions d'écriture (clé service uniquement) ----------

-- Crée salle + joueur siège 0 + état. Lève unique_violation si le code est pris.
create or replace function public.create_room(p_code text, p_user_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  insert into rooms (code) values (p_code) returning id into v_room_id;
  insert into players (room_id, user_id, name, seat) values (v_room_id, p_user_id, p_name, 0);
  insert into game_state (room_id) values (v_room_id);
  return v_room_id;
end;
$$;

-- Ajoute le joueur siège 1. Revenir dans sa propre salle est autorisé.
create or replace function public.join_room(p_code text, p_user_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_count int;
begin
  select * into v_room from rooms where code = p_code for update;
  if not found then
    raise exception 'room_not_found';
  end if;
  if exists (select 1 from players where room_id = v_room.id and user_id = p_user_id) then
    return v_room.id;
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_not_lobby';
  end if;
  select count(*) into v_count from players where room_id = v_room.id;
  if v_count >= 2 then
    raise exception 'room_full';
  end if;
  insert into players (room_id, user_id, name, seat) values (v_room.id, p_user_id, p_name, 1);
  update game_state set version = version + 1, updated_at = now() where room_id = v_room.id;
  return v_room.id;
end;
$$;

-- Applique une transition de jeu calculée par une Edge Function, en une seule transaction.
--   p_expected_version : version lue par la fonction ; si elle a changé entre-temps -> 'conflict'
--   p_state            : champs de game_state à modifier (fusionnés dans la ligne existante)
--   p_round_patch      : champs d'un tour existant à modifier, avec sa clé "id"
--   p_new_round        : tour à créer (ligne complète)
--   p_new_secret       : secret du tour à créer
--   p_room_status      : nouveau statut de la salle
--   p_reset_rounds     : supprime tous les tours de la salle (revanche)
create or replace function public.apply_game_update(
  p_room_id uuid,
  p_expected_version int,
  p_state jsonb default null,
  p_round_patch jsonb default null,
  p_new_round jsonb default null,
  p_new_secret jsonb default null,
  p_room_status text default null,
  p_reset_rounds boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cur game_state;
  nxt game_state;
  r rounds;
begin
  select * into cur from game_state where room_id = p_room_id for update;
  if not found then
    raise exception 'room_not_found';
  end if;
  if cur.version <> p_expected_version then
    raise exception 'conflict';
  end if;

  if p_reset_rounds then
    delete from rounds where room_id = p_room_id;
  end if;

  if p_round_patch is not null then
    select * into r from rounds where id = (p_round_patch->>'id')::uuid and room_id = p_room_id for update;
    if not found then
      raise exception 'round_not_found';
    end if;
    r := jsonb_populate_record(r, p_round_patch - 'id' - 'room_id');
    update rounds set
      answer_text = r.answer_text,
      answer_media_path = r.answer_media_path,
      guess_text = r.guess_text,
      llm_score = r.llm_score,
      llm_comment = r.llm_comment,
      judge_failed = r.judge_failed,
      heart = r.heart,
      appeal_scores = r.appeal_scores,
      appeal_manual = r.appeal_manual,
      final_score = r.final_score,
      wheel_level = r.wheel_level,
      wheel_index = r.wheel_index,
      wheel_result = r.wheel_result,
      position_after = r.position_after,
      revealed = r.revealed,
      continue_votes = r.continue_votes
    where id = r.id;
  end if;

  if p_new_round is not null then
    insert into rounds (id, room_id, turn_number, case_index, media, answerer_seat)
    values (
      (p_new_round->>'id')::uuid,
      p_room_id,
      (p_new_round->>'turn_number')::int,
      (p_new_round->>'case_index')::int,
      p_new_round->>'media',
      (p_new_round->>'answerer_seat')::smallint
    );
  end if;

  if p_new_secret is not null then
    insert into round_secrets (round_id, question_id, question_text, theme, answerer_user_id)
    values (
      (p_new_secret->>'round_id')::uuid,
      p_new_secret->>'question_id',
      p_new_secret->>'question_text',
      p_new_secret->>'theme',
      (p_new_secret->>'answerer_user_id')::uuid
    );
  end if;

  nxt := jsonb_populate_record(cur, coalesce(p_state, '{}'::jsonb) - 'room_id' - 'version' - 'updated_at');
  update game_state set
    phase = nxt.phase,
    turn_number = nxt.turn_number,
    turns_counted = nxt.turns_counted,
    answerer_seat = nxt.answerer_seat,
    position = nxt.position,
    inventory = nxt.inventory,
    appeal_used = nxt.appeal_used,
    next_wheel_override = nxt.next_wheel_override,
    shield_active = nxt.shield_active,
    current_round_id = nxt.current_round_id,
    outcome = nxt.outcome,
    version = cur.version + 1,
    updated_at = now()
  where room_id = p_room_id;

  if p_room_status is not null then
    update rooms set status = p_room_status where id = p_room_id;
  end if;

  return cur.version + 1;
end;
$$;

-- Ces fonctions ne doivent être appelables qu'avec la clé service.
revoke execute on function public.create_room(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.join_room(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.apply_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.create_room(text, uuid, text) to service_role;
grant execute on function public.join_room(text, uuid, text) to service_role;
grant execute on function public.apply_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, text, boolean) to service_role;
