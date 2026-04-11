-- Run this in the Supabase SQL editor to recreate the single-row auction store.

drop table if exists public.auction_state;
drop function if exists public.set_auction_state_updated_at();

create table public.auction_state (
  id integer primary key default 1 check (id = 1),
  phase text not null default 'lobby' check (phase in ('lobby', 'bidding', 'results')),
  roster jsonb not null default '[]'::jsonb,
  roster_index integer not null default 0,
  current_player text,
  current_ovr integer,
  current_bid integer not null default 0,
  current_leader text,
  bid_history jsonb not null default '[]'::jsonb,
  purses jsonb not null default '{}'::jsonb,
  sold_log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.auction_state is 'Single live state row for the IPL mega auction app.';
comment on column public.auction_state.bid_history is 'Active round stack used for undo while bidding.';
comment on column public.auction_state.sold_log is 'Final sale records. Each item stores player, ovr, winner, price, and bidTrail.';

create or replace function public.set_auction_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger auction_state_set_updated_at
before update on public.auction_state
for each row
execute function public.set_auction_state_updated_at();

insert into public.auction_state (
  id,
  phase,
  roster,
  roster_index,
  current_player,
  current_ovr,
  current_bid,
  current_leader,
  bid_history,
  purses,
  sold_log
) values (
  1,
  'lobby',
  '[]'::jsonb,
  0,
  null,
  null,
  0,
  null,
  '[]'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb
)
on conflict (id) do update
set
  phase = excluded.phase,
  roster = excluded.roster,
  roster_index = excluded.roster_index,
  current_player = excluded.current_player,
  current_ovr = excluded.current_ovr,
  current_bid = excluded.current_bid,
  current_leader = excluded.current_leader,
  bid_history = excluded.bid_history,
  purses = excluded.purses,
  sold_log = excluded.sold_log;

alter table public.auction_state enable row level security;

drop policy if exists "Allow all" on public.auction_state;
create policy "Allow all"
on public.auction_state
for all
using (true)
with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.auction_state;
  exception
    when duplicate_object then null;
  end;
end;
$$;
