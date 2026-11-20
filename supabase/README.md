# Database scripts

Run these in the Supabase SQL Editor, in order, on a **new** project:

1. `01_schema.sql` tables, security policies, storage, realtime
2. `02_workflow.sql` status rules, triggers and resident functions
3. `03_notifications.sql` stored notifications
4. `04_extras.sql` community counts

To make someone an admin or collector, sign up in the app first, then run:

    update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = 'person@example.com');

Do not run these against a project that already holds data you want to keep.
