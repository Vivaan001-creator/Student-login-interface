# Security upgrade - do these steps in this order (about 10 minutes)

This upgrade works on the free Firebase (Spark) plan. No Cloud Functions, no Blaze plan.

## What changed
- Student and parent data is no longer public. Before, anyone could download every child's name, date of birth, phone, address, marks and fees. Now only the admin, the teachers, the student and the registered parent can read it.
- Student login asks for roll number + date of birth + last 4 digits of the parent's registered mobile. Parent login asks for roll number + registered mobile (as before). The database itself checks these, so setting a value by hand in the browser no longer opens anyone's dashboard.
- Tests: the answer key is locked until the test has closed for every student (including rescheduled ones). Nobody can start or submit a test for another student. Questions can be read only by a student of that class and section.
- Nobody can write fake login logs, payments or profile requests any more. Only a logged-in student or parent can, and only for their own child.
- Logins last 12 hours (students, parents, teachers, admin). Pages hide themselves if another website tries to put them in a frame.

## Steps
1. **Firebase console > Authentication > Sign-in method > Anonymous > Enable > Save.** Students and parents cannot log in without this.
2. **Upload the whole project** to GitHub (replace everything). Wait 2 minutes.
3. **Firebase console > Firestore Database > Rules.** Open `firestore.rules` from this project, copy everything, paste it, press **Publish**. Do this right after step 2, because the new login needs the new rules.
4. Open the app on a phone **twice** (the first open refreshes the cached copy).
5. Test each login: admin, a teacher, a student (roll + DOB + last 4 digits), a parent (roll + mobile). Open a student's marks and fee page.

If something goes wrong, publish your old rules again and upload your old files. Both are safe to go back to.

## Good to know
- A student with no mobile number saved cannot log in. Add the number in Edit Student.
- Date of birth is accepted as 2014-05-09, 09-05-2014 or 09/05/2014, whichever way the record was saved.
- A parent's mobile must match what is saved, exactly as typed in the record (same as before).
- Tests made before this upgrade keep working. Their answer key opens after the last start time plus the time limit.
- If a teacher or the admin signs in on the same phone where a student was logged in, the student is logged out (and the other way round).

## Optional but recommended (free)
1. **App Check**: Firebase console > App Check > register the web app with reCAPTCHA v3. Paste the site key into `APP_CHECK_SITE_KEY` in `Firebase.js`, upload, then press **Enforce** for Cloud Firestore. This stops scripts and fake apps from using your database and wasting your free quota.
2. **Budget alert / usage**: Firebase console > Usage and billing. Check the daily reads/writes now and then.
3. **Admin account**: use a long unique password. In `firestore.rules`, replace the admin email check with your admin UID (a comment shows where).
4. Authentication > Settings: turn on **Email enumeration protection**, and disable sign-in methods you do not use (keep Email/Password and Anonymous).

## What this does not fix (needs a server, or a big rewrite)
- A student whose roll number, date of birth and mobile tail are all known to someone can log in as them. That is true of any login that has no password.
- The games leaderboard is still open for anyone to write to (it holds only nicknames and points). App Check reduces spam.
- The pages still allow inline scripts (`'unsafe-inline'` in the Content Security Policy), because many buttons use `onclick`. Moving those to event listeners is a larger clean-up.
