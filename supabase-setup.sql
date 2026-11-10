-- MoBe Revenue Tracker — schema database (incolla tutto in Supabase → SQL Editor → Run)
-- Ogni riga appartiene all'utente che l'ha creata: nessun altro può leggerla o modificarla.

create table if not exists public.clients (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  info        text not null default '',
  created_at  bigint,
  updated_at  bigint
);

create table if not exists public.entries (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id    text not null references public.clients(id) on delete cascade,
  date         date not null,
  amount_cents bigint not null check (amount_cents > 0),
  scorporo     boolean not null default false,
  quota_cents  bigint not null default 0,
  netto_cents  bigint not null default 0,
  note         text not null default '',
  created_at   bigint,
  modified_at  bigint,
  updated_at   bigint
);

create table if not exists public.links (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ym               text not null,
  client_id        text not null references public.clients(id) on delete cascade,
  invoice_sent     boolean not null default false,
  invoice_sent_at  date,
  paid             boolean not null default false,
  paid_at          date,
  created_at       bigint,
  updated_at       bigint
);

create index if not exists entries_user_date on public.entries(user_id, date);
create index if not exists entries_client on public.entries(client_id);
create index if not exists links_client on public.links(client_id);

alter table public.clients enable row level security;
alter table public.entries enable row level security;
alter table public.links   enable row level security;

drop policy if exists "solo i miei clienti" on public.clients;
drop policy if exists "solo le mie entrate" on public.entries;
drop policy if exists "solo i miei stati"   on public.links;
create policy "solo i miei clienti" on public.clients for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo le mie entrate" on public.entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo i miei stati"   on public.links   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- aggiornamenti in tempo reale tra telefono e computer
do $$ begin
  begin alter publication supabase_realtime add table public.clients; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.entries; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.links;   exception when duplicate_object then null; end;
end $$;
