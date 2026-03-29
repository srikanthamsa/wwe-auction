-- Run this entire block in your Supabase SQL Editor

create table if not exists auction_state (
  id integer primary key default 1,
  phase text default 'lobby',
  roster jsonb default '[]',
  roster_index integer default 0,
  current_superstar text,
  current_ovr integer,
  current_bid integer default 0,
  current_leader text,
  timer_end timestamptz,
  purses jsonb default '{}',
  sold_log jsonb default '[]',
  updated_at timestamptz default now()
);

-- Insert the initial row
insert into auction_state (id, phase) values (1, 'lobby')
on conflict (id) do nothing;

-- Enable realtime on this table
alter publication supabase_realtime add table auction_state;

-- Allow public read/write (this is a private game, no auth needed)
create policy "Allow all" on auction_state for all using (true) with check (true);
alter table auction_state enable row level security;
