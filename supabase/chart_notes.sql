-- chart_notes 테이블
-- chart_type: 'daily_send' | 'purchase_trend' | 'event_trend'
-- date: YYYY-MM-DD
-- project_id: projects.id (FK)

create table if not exists chart_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  chart_type text not null,
  date text not null,          -- YYYY-MM-DD
  note text not null,
  author_id uuid references auth.users(id),
  author_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, chart_type, date)
);

-- RLS
alter table chart_notes enable row level security;

-- 같은 프로젝트 멤버는 읽기 가능
create policy "project members can read notes"
  on chart_notes for select
  using (
    project_id in (
      select project_id from project_members where user_id = auth.uid()
    )
  );

-- 같은 프로젝트 멤버는 작성/수정 가능
create policy "project members can insert notes"
  on chart_notes for insert
  with check (
    project_id in (
      select project_id from project_members where user_id = auth.uid()
    )
  );

create policy "project members can update notes"
  on chart_notes for update
  using (
    project_id in (
      select project_id from project_members where user_id = auth.uid()
    )
  );

create policy "project members can delete notes"
  on chart_notes for delete
  using (
    project_id in (
      select project_id from project_members where user_id = auth.uid()
    )
  );
