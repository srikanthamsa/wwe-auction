-- Run this entire block in your Supabase SQL Editor to reset/recreate the table

drop table if exists auction_state;

create table auction_state (
  id integer primary key default 1,
  phase text default 'lobby',
  roster jsonb default '[]',
  roster_index integer default 0,
  current_superstar text,
  current_ovr integer,
  current_bid integer default 0,
  current_leader text,
  bid_history jsonb default '[]',
  purses jsonb default '{}',
  sold_log jsonb default '[]',
  updated_at timestamptz default now()
);

insert into auction_state (id, phase) values (1, 'lobby')
on conflict (id) do nothing;

alter publication supabase_realtime add table auction_state;

drop policy if exists "Allow all" on auction_state;
create policy "Allow all" on auction_state for all using (true) with check (true);
alter table auction_state enable row level security;
