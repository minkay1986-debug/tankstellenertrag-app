-- Automatically remove moderated public idea suggestions after the agreed retention period.
-- Pending suggestions remain available until an administrator reviews them.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'cleanup-public-idea-suggestions';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-public-idea-suggestions',
    '15 3 * * *',
    $cleanup$
      delete from public.public_idea_suggestions
       where (status = 'rejected' and reviewed_at < now() - interval '30 days')
          or (status = 'approved' and reviewed_at < now() - interval '60 days');
    $cleanup$
  );
end
$$;
