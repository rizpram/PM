-- Public Executive Dashboard (no login) - token protected
-- Run AFTER 01_setup.sql

create table if not exists public.public_dashboard_settings (
  id int primary key default 1,
  share_token text not null,
  created_at timestamptz not null default now()
);

insert into public.public_dashboard_settings (id, share_token)
values (1, encode(gen_random_bytes(18), 'hex'))
on conflict (id) do nothing;

create or replace function public.get_public_dashboard_v3(p_token text, p_days int default 30)
returns json
language plpgsql
security definer
as $$
declare
  saved_token text;
  today date := current_date;
  days int := greatest(7, least(coalesce(p_days, 30), 180));
  start_day date := today - (days - 1);
  result json;
begin
  select share_token into saved_token from public.public_dashboard_settings where id = 1;

  if saved_token is null or p_token is null or p_token <> saved_token then
    raise exception 'unauthorized';
  end if;

  result := json_build_object(
    'as_of', today,
    'days', days,
    'range_start', start_day,
    'range_end', today,

    'projects_total', (select count(*) from public.projects),
    'projects_active', (select count(*) from public.projects where status='active'),
    'projects_completed', (select count(*) from public.projects where status='completed'),

    'tasks_overdue_count', (
      select count(*) from public.tasks
      where due_date is not null and due_date < today and status <> 'done'
    ),

    'panjar_overdue_amount', (
      select coalesce(sum(amount),0) from public.panjar
      where settled_at is null and due_settlement is not null and due_settlement < today
    ),

    'top_risk_projects', (
      select coalesce(json_agg(x), '[]'::json)
      from (
        select id, name, health, status, end_date
        from public.projects
        where status='active' and health in ('at_risk','off_track')
        order by (case when health='off_track' then 0 else 1 end), end_date nulls last
        limit 10
      ) x
    ),

    'top_overdue_by_project', (
      select coalesce(json_agg(x), '[]'::json)
      from (
        select
          p.id,
          p.name,
          p.health,
          p.end_date,
          (select count(*)
           from public.tasks t
           where t.project_id = p.id
             and t.due_date is not null
             and t.due_date < today
             and t.status <> 'done'
          ) as overdue_tasks,
          (select coalesce(sum(pa.amount),0)
           from public.panjar pa
           where pa.project_id = p.id
             and pa.settled_at is null
             and pa.due_settlement is not null
             and pa.due_settlement < today
          ) as overdue_panjar_amount
        from public.projects p
        where p.status = 'active'
        order by
          (select count(*)
           from public.tasks t
           where t.project_id = p.id
             and t.due_date is not null
             and t.due_date < today
             and t.status <> 'done'
          ) desc,
          (select coalesce(sum(pa.amount),0)
           from public.panjar pa
           where pa.project_id = p.id
             and pa.settled_at is null
             and pa.due_settlement is not null
             and pa.due_settlement < today
          ) desc
        limit 10
      ) x
    ),

    'trend', (
      select json_build_object(
        'tasks_overdue_series', (
          select coalesce(json_agg(json_build_object('d', d::date, 'v', v) order by d), '[]'::json)
          from (
            select d,
                   (select count(*) from public.tasks t
                    where t.due_date is not null and t.due_date < d::date and t.status <> 'done') as v
            from generate_series(start_day, today, interval '1 day') d
          ) s
        ),

        'panjar_overdue_amount_series', (
          select coalesce(json_agg(json_build_object('d', d::date, 'v', v) order by d), '[]'::json)
          from (
            select d,
                   (select coalesce(sum(p.amount),0) from public.panjar p
                    where p.settled_at is null and p.due_settlement is not null and p.due_settlement < d::date) as v
            from generate_series(start_day, today, interval '1 day') d
          ) s
        ),

        'projects_completed_series', (
          select coalesce(json_agg(json_build_object('d', d::date, 'v', v) order by d), '[]'::json)
          from (
            select d,
                   (select count(*)
                    from public.projects pr
                    where pr.status = 'completed'
                      and pr.updated_at::date = d::date
                   ) as v
            from generate_series(start_day, today, interval '1 day') d
          ) s
        )
      )
    )
  );

  return result;
end;
$$;

grant execute on function public.get_public_dashboard_v3(text, int) to anon;
