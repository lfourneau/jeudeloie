-- V3 : plateau de 63 cases (jeu de l'oie), pions dessinés (ids texte au lieu d'emojis).

alter table public.game_state drop constraint if exists game_state_position_check;
alter table public.game_state add constraint game_state_position_check check (position between 0 and 63);

alter table public.game_state alter column pawn set default 'oie';
update public.game_state
set pawn = 'oie'
where pawn not in ('oie', 'tortue', 'renard', 'chat', 'escargot', 'enveloppe', 'avion',
                   'montgolfiere', 'bateau', 'velo', 'coeur', 'etoile');
