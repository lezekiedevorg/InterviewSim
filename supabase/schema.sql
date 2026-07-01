-- Table des sessions d'entretien sauvegardées
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  poste text not null,
  context jsonb not null,
  debrief jsonb not null,
  score_confiance int not null
);

-- Index pour lister les sessions d'un utilisateur par date
create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);

-- Row-Level Security : chacun ne voit/écrit que ses lignes
alter table public.sessions enable row level security;

create policy "select_own_sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "insert_own_sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "delete_own_sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
