-- V2 : médias dessin / photo / musique / GIF, cases à effet, bonus d'originalité, pion commun.

-- ---------- Colonnes ----------

alter table public.rounds drop constraint rounds_media_check;
alter table public.rounds add constraint rounds_media_check
  check (media in ('mot', 'nombre', 'emojis', 'dessin', 'photo', 'musique', 'gif'));

alter table public.rounds
  add column answer_media jsonb,                         -- musique / GIF : métadonnées relues côté serveur
  add column originality_bonus boolean not null default false,
  add column landed_index int,                           -- case atteinte par la roue, avant l'effet
  add column case_effect jsonb;                          -- { type, label, delta } ou null

alter table public.game_state
  add column pawn text not null default '🧸';

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
    pawn = nxt.pawn,
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

-- ---------- Storage : dessins et photos ----------
-- Chemin : <room_id>/<round_id>.png|jpg. Upload uniquement par URL signée (Edge Function upload-url).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('answers', 'answers', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture réservée aux deux joueurs de la salle (le premier dossier du chemin est l'id de la salle).
create policy "membres lisent les réponses de leur salle" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'answers'
    -- comparaison en texte : pas de conversion uuid qui pourrait échouer sur un nom inattendu
    and (storage.foldername(name))[1] in (
      select p.room_id::text from public.players p where p.user_id = auth.uid()
    )
  );
-- Aucune politique d'insertion / modification / suppression : le client ne peut pas écrire directement.
