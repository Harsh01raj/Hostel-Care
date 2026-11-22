# HostelCare

HostelCare is a static front end backed by Supabase for email OTP sign-in, approved room assignments, cleaning requests, complaints and request tracking.

## Configure Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the contents of [`supabase-schema.sql`](supabase-schema.sql). It creates the room roster, request table, row-level security policies and a trigger that attaches every request to the signed-in student's approved room.
3. Add approved student email-to-room pairs in the SQL Editor. For example:

   ```sql
   insert into public.room_assignments (email, hostel, room)
   values ('student@example.com', 'Hostel A', '204');
   ```

   Email addresses must be lowercase. Each email can appear only once and therefore maps to exactly one room. Multiple students may share a room. Only staff with database admin access should add or change these assignments; there is no public roster-registration form.
4. In Supabase Authentication, enable email sign-in and edit the email template to show the one-time code (`{{ .Token }}`), rather than only a magic link. Configure a trusted SMTP provider for reliable delivery to students; the default email service may be restricted for testing.
5. In **Project Settings → API**, copy the project URL and the publishable/anon key into [`js/supabase-config.js`](js/supabase-config.js). The publishable/anon key is intended for browser use; **never** put a `service_role` key in this file.
6. In Authentication URL settings, add the deployed website URL to the allowed site URLs.

The database policies prevent students from editing the roster or viewing another student's requests. A database trigger obtains the email, hostel and room from the verified account and approved roster, so values supplied by the browser cannot be used to claim another room. An email without a roster entry can verify its address but cannot submit or view requests.

## Run locally

The site has separate pages for the home page, services, sign-in, cleaning requests, complaints and request tracking. Keep the `css` and `js` folders alongside the HTML files. Fill in the Supabase settings, then open `index.html` in a browser or use VS Code Live Server. Run the SQL setup before testing. The browser-only localStorage demo has been replaced; existing local demo records are not automatically migrated to Supabase.

## Deploy on InfinityFree

1. Create an InfinityFree hosting account/domain.
2. Upload all the HTML pages and the `css` and `js` folders into the website's `htdocs` folder.
3. Complete the Supabase setup above and add the deployed domain to Supabase's allowed site URLs.
4. Visit the domain and test with an email already present in `room_assignments`.

The database schema file is run in Supabase's SQL Editor; it is not a website file.
