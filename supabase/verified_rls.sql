-- Allow founder to update verified_by on any user row
drop policy if exists "Founder can update verified_by" on users;
create policy "Founder can update verified_by"
on users
for update
using (
  exists (
    select 1 from users u2
    where u2.auth_id = auth.uid()
    and u2.profile_data->>'role' = 'founder'
  )
);
