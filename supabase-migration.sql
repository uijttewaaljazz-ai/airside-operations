-- Airside Operations v1.0 - meerdere foto's per melding
-- Voer dit volledige bestand uit in Supabase > SQL Editor.

alter table public.points
  add column if not exists photo_urls text[] not null default '{}'::text[];

-- Neem bestaande enkele foto's automatisch mee.
update public.points
set photo_urls = array[photo_url]
where photo_url is not null
  and photo_url <> ''
  and coalesce(array_length(photo_urls, 1), 0) = 0;
