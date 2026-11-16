-- V5 : catégories de questions (mignon, drôle, spicy, profond).

-- Catégories actives de la partie, choisies par l'hôte en salle d'attente.
alter table public.game_state
  add column categories jsonb not null default '["mignon", "drole", "spicy", "profond"]'::jsonb;

-- Catégorie et niveau de spicy du tour : visibles par les deux joueurs (badge à l'écran).
-- null pour une question de la section générique.
alter table public.rounds
  add column categorie text check (categorie in ('mignon', 'drole', 'spicy', 'profond')),
  add column niveau smallint check (niveau in (1, 2));

-- ---------- Écriture transactionnelle : nouvelles colonnes ----------

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
      answer_media = r.answer_media,
      guess_text = r.guess_text,
      llm_score = r.llm_score,
      llm_comment = r.llm_comment,
      judge_failed = r.judge_failed,
      originality_bonus = r.originality_bonus,
      heart = r.heart,
      appeal_scores = r.appeal_scores,
      appeal_manual = r.appeal_manual,
      final_score = r.final_score,
      wheel_level = r.wheel_level,
      wheel_index = r.wheel_index,
      wheel_result = r.wheel_result,
      landed_index = r.landed_index,
      case_effect = r.case_effect,
      position_after = r.position_after,
      revealed = r.revealed,
      continue_votes = r.continue_votes,
      joker_keyword = r.joker_keyword,
      joker_topic = r.joker_topic,
      joker_choices = r.joker_choices
    where id = r.id;
  end if;

  if p_new_round is not null then
    insert into rounds (id, room_id, turn_number, case_index, media, answerer_seat, categorie, niveau)
    values (
      (p_new_round->>'id')::uuid,
      p_room_id,
      (p_new_round->>'turn_number')::int,
      (p_new_round->>'case_index')::int,
      p_new_round->>'media',
      (p_new_round->>'answerer_seat')::smallint,
      p_new_round->>'categorie',
      (p_new_round->>'niveau')::smallint
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
    pawn = nxt.pawn,
    categories = nxt.categories,
    version = cur.version + 1,
    updated_at = now()
  where room_id = p_room_id;

  if p_room_status is not null then
    update rooms set status = p_room_status where id = p_room_id;
  end if;

  return cur.version + 1;
end;
$$;

revoke execute on function public.apply_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.apply_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, text, boolean) to service_role;
