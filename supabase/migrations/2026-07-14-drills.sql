create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null,
  score int not null check (score between 0 and 100),
  report jsonb,
  created_at timestamptz not null default now()
);
alter table public.drills enable row level security;

create policy "drills lisibles par leur auteur" on public.drills
  for select using (auth.uid() = user_id);
create policy "drills insérables par leur auteur" on public.drills
  for insert with check (auth.uid() = user_id);

create index if not exists drills_user_created_idx on public.drills (user_id, created_at desc);
