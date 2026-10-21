# GenAlpha security report

Date: 10 October 2026. Everything here was checked by reading the code and running pages in a headless browser. Nothing was tested against your live Firebase project.

## 1. Your current Firestore rules are the biggest problem

```
match /{document=**} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

Firestore rules are combined with OR. If any rule allows an action, it is allowed. That means:

- The "exceptions" below it do nothing. `subscribers` is marked "no read", but the first rule already lets everyone read it. The same goes for `loginLogs`, payments, messages and every other collection.
- Anyone on the internet can read every collection, including sign-in logs and subscriber emails.
- Anyone who is signed in can write or delete anything. Signing in is easy: your Firebase `apiKey` is public by design, and sign-up is open (the admin screen itself creates teacher accounts from the browser). An attacker can create a free account and then edit or delete students, fees, notices and teachers.

Replace them with `firestore.rules` (see section 4).

## 2. What is still exposed after the new rules

Student and parent login happens in the browser: the page reads the student document and compares date of birth or phone number. For that to work, student documents must stay publicly readable. Anyone who knows the project settings can list student names, dates of birth, fathers' names and phone numbers.

The real fix is to sign students and parents in with Firebase Auth. Two ways:
- A Cloud Function that checks roll number plus date of birth (or phone) on the server, limits attempts, and returns a sign-in token. This needs the Blaze (pay as you go) plan.
- Create a Firebase Auth account for each student or parent, like teachers already have.

Until then, treat student data as readable by anyone technical, and do not store anything more sensitive in those documents.

## 3. What was changed in the code

- `session-timer.js`: admin and teacher pages now wait for a real Firebase sign-in. Admin pages also require the admin email. Before, a `localStorage` flag was enough.
- `admin.js`: admin login rejects non-admin accounts and shows one generic error. Fixed unescaped output (class names, teacher names and emails, gallery URLs), quote-breaking IDs in `onclick`, and unsafe upload file names. Teachers get an access record (`teacherAccounts`) that the rules use.
- `teacher.js`, `parent.js`: same `onclick` fix.
- Every page: Content-Security-Policy meta tag, referrer policy, `noindex` on private pages, favicon, descriptions, consistent titles, legal links in the footer.
- New: `privacy.html`, `terms.html`, `cookies.html`, `refund.html`, `404.html`.
- `student-register.html`: removed the placeholder number (now uses 917970500551), added a parent/guardian consent checkbox, validation and inline messages.
- Unused files renamed with an `unused-` prefix: `unused-assistant.html`, `unused-coming-soon.html`, `unused-home.js`. Nothing links to them. `_config.yml` tells GitHub Pages not to publish them, nor this report, the rules files, `package.json`, `capacitor.config.json` or the original images. Do not add a `.nojekyll` file or that list stops working. If your repo is published by a GitHub Action instead of the default branch build, `_config.yml` is ignored, so check that `SECURITY-REPORT.md` is not reachable on your site.
- Accessibility: every form control has a label, keyboard focus is always visible, browser pop-up alerts are replaced by on-page messages (success and error), teacher phone numbers and emails are tap-to-call and tap-to-email. Text contrast was checked automatically on every page in light and dark mode (empty-data state) and now passes. Fixed along the way: invisible text on form cards in dark mode, faint footer and bottom-nav labels, and an unreadable teacher signature in dark mode on the result page.
- Style: button corners are no longer pill shaped, purple gradients in `admin.css` are solid colours, em dashes removed.
- Images: login logo reduced from 396 KB to 178 KB. Originals are `logo-original.png` and `favicon-original.png` (excluded from the website by `_config.yml`).
- Mobile (admin): the dashboard had its page padding wiped out by a later CSS rule, so everything touched the screen edges; fixed, with a 2x2 stats grid. List cards no longer overflow their box, class teacher and payment history cells are tidy. All 19 admin pages were run against realistic mock data at 360 and 320 px wide, light and dark, with a check that no element sticks out past the screen.
- Edit profile (pencil icon):
  - Teacher: pencil on My Profile opens `teacher-edit-profile.html`. Saves directly. A teacher can change only name, mobile, contact email, date of birth, gender, address, qualification, experience and "about". Login email, status, subject, ID and class assignment stay with the admin (the rules enforce this).
  - Admin: pencil in the top-right of the dashboard header opens `admin-edit-profile.html`. Saved in `appMeta/adminProfile` (readable and writable only by the admin) and the dashboard greets you by that name. The login email is fixed because the rules recognise the admin by it.
  - Parent: pencil on Child Profile opens `parent-edit-profile.html` with the child's full profile, parent names, registered mobile, alternate mobile, email and address, plus a consent checkbox. **Changes are sent as a request and the admin approves them in Profile Requests** (`profile-requests.html`, linked from the dashboard and More, with a pending count). This is deliberate: parents are not real Firebase users, so anyone who knows a roll number could otherwise change a child's mobile number or date of birth, which are the login details. Approving applies the change; rejecting leaves the record alone and the parent sees the reason on their dashboard.
  - Limits: a parent can have one pending request at a time; requests can be spammed (no rate limit is possible without a backend); the parent sees the status of the latest request only on the same browser; teacher name changes do not rewrite names already stored in class records. Changing a parent mobile number means logging in with the new number after approval.
  - Add and edit student forms (admin) have new Alternate Mobile and Parent Email fields so approved data is visible and not lost.
- Notifications (new):
  - A Yes / No prompt asks for notification permission once, before the browser's own prompt. No is remembered for 7 days.
  - Newly published tests are announced the same way: a message while the app is open, a blinking red dot, a New test entry in the bell panel (Tests section), and a phone notification if the app is in the background and notifications are allowed. Drafts and tests for other classes are not announced. The panel now shows Notices and Tests first, and app update notes after them.
  - Student and parent dashboards have a bell at the top. A blinking red dot (also on the Notices tab) means a new notice or app update. Opening the bell lists updates and notices, marks them seen and clears the dot.
  - New features are highlighted once per device with a glowing ring and a NEW tag, then go back to normal. Teachers and admins get a "What's new" bar under the header.
  - **Update notes are role-specific.** Every release in `whats-new.json` lists the roles it is for, and a person only sees releases for their own role: a teacher-only change (such as faster question import) never shows a dot, banner, panel entry or phone notification to students, parents or the admin, and an admin-only change never reaches teachers. A role with no release for a version is not told about it at all. If a release is meant for two groups, write one release per group so each note is worded for them.
  - How you announce an update: edit `whats-new.json` and upload it with your files (steps in `HOW-TO-ANNOUNCE-UPDATES.md`). Open apps check for it every 5 minutes. New notices are stamped with an upload time (`createdAt`) so devices know what is new.
  - Files: `notify.js`, `notify.css`, `sw.js` (service worker), `manifest.webmanifest` and two icons (lets the site be added to the Home Screen, which iPhones need for notifications).
  - Tested in a real browser with a real service worker notification: permission Yes and No, remembering the choice, highlight once, dot blink, panel, update banner, and a phone notification when the app is in the background.
  - **Limit: no push to a closed phone.** Notifications arrive only while the app or tab is open or in the background. Waking a phone with the app fully closed needs Firebase Cloud Messaging plus a Cloud Function (Blaze plan) and a web push key. That is not built. In the Android app build (Capacitor), system notifications need a Capacitor notification plugin; the bell, red dot and highlights work there already.
- Online tests (new):
  - **Teacher** (`teacher-tests.html`, `teacher-test-edit.html`, `teacher-test-report.html`): design multiple choice questions (2 to 4 options, one correct), choose subject, class, time (hours and minutes), start time, last time to start, and marks per question. Save as draft or publish. A published test is locked so every student gets the same paper. Results page: every student's marks, rank, time taken, how often they left the test screen, a view of each student's answers, students who did not submit, and "Let them retake". Only the class teacher (the teacher whose email is on the class) can create tests for that class.
  - **Adding questions faster** (teacher designer, `question-import.js`): instead of typing, the teacher can paste questions (from Word, WhatsApp, PDF, Excel cells or an AI chat), upload a CSV or text file (sample file included), or copy a ready-made request for ChatGPT, Claude or Gemini and paste the reply back. A preview shows what was found before anything is added. It understands numbered and unnumbered questions, `A)`, `(a)`, `A.` options, options on one line, the answer as `Answer: B`, as the option text, as a star or tick on the option, or as an answer key at the end. Questions without a clear answer are added but flagged, and cannot be published until the teacher picks the answer. Tested with 29 layout checks plus a full browser run. It does not read Word (.docx) or PDF files directly (copy and paste from them instead), and there is no built-in AI because that needs a paid server.
  - **Student** (`student-tests.html`): each test is a card with the subject in bold, the time and marks in small text, the start time, and an arrow on the right. The arrow is locked (dashed) until the start time and then opens by itself. `take-test.html`: the student verifies name, father's name, date of birth and registered mobile number, then the questions and a countdown appear. If they leave the screen (other app, other tab, back, reload) the questions, their answers and the verification are erased and they must verify again. The timer keeps running from a start time saved once on the server, so leaving does not reset it. After Submit, each question is marked correct, wrong or not answered against the teacher's key, with the right answer shown.
  - **Parent** (`parent-tests.html`, `test-report.html`): sees the child's tests and, after the child submits, the same score and report. Parents cannot start a test.
  - How the answers are protected (`firestore.rules`): the questions are readable only after the start time; the answer key is readable only after that student has submitted; each student can attempt once; submissions cannot be edited; the deadline (time allowed plus 2 minutes) is checked by the server on submit.
  - **These rules are the most complex in the project and could not be run in the Firebase emulator.** After publishing the rules, test as a teacher (publish), a student (before and after the start time, and after submitting) and a parent. If a step is refused, tell me which one.
  - Limits to know: leaving the screen is detected, but a second phone, a helper sitting next to the student, or a screenshot cannot be detected. A student who submits sees the right answers and can share them. Verification uses the same details as student login, which are publicly readable until students and parents move to Firebase Auth. Anyone who knows a roll number could submit for that roll and lock their attempt; the teacher can reset it with "Let them retake". Tests are not announced as a notice or push notification yet. Admin has no screen for tests (teachers only).
- Mobile: two-column forms stack on phones. All 41 pages load at 360 px wide with no sideways scrolling. Teacher, student and parent pages were also run against mock data at 360 and 320 px, light and dark.
- Logins: all four roles (student, parent, teacher, admin) now show a success message and the message survives the redirect to the dashboard. Parent logins are now recorded in Login Activity (before, only student, teacher and admin were). Admin login now waits up to 2.5 seconds for its log to be sent, so leaving the page no longer cancels it.
- Login Activity: each record has a Delete button, and Clear All Records removes every record (not just the 200 shown), both with a confirmation. A Parent Logins count and badge were added.
- Parent dashboard: Mother's Name added to the child profile.
- Contrast: re-checked with realistic data loaded (the earlier check ran on empty pages and missed table buttons and status badges). Fixed Edit, View, Delete, status badges, subject chips and similar. Zero failures on the pages tested, light and dark.
- Rules audit (repeated after adding profile requests and teacher self-edit): every Firestore read and write in the code was compared with `firestore.rules`. They match, including the exact fields written for login logs, parent payment reports, homework and login tracking.
- Release build: `package.json` has a new `build:android:release` script. The existing `build:android` makes a debug build, which should not be shipped; a release build must be signed with your own keystore.

## 4. What you must do (in this order)

1. Back up: Firebase console, Firestore, export data (or note that it can be recreated).
2. Upload this project to your repo so the new admin code is live. Open the admin dashboard once while signed in as admin. This creates the `teacherAccounts` records for existing teachers. Teachers cannot sign in until it has run.
3. Firestore, Rules: paste `firestore.rules`, Publish.
4. Storage, Rules: paste `storage.rules`, Publish.
5. Test as each role: admin (add student, add teacher, notices, fees), teacher (marks, attendance, homework), student, parent (report a payment). Use the Rules Playground in the console too.
6. Google Cloud Console, APIs and Services, Credentials: edit the browser key and restrict it to `https://vivaan001-creator.github.io/*` (and your custom domain later).
7. Firebase, Authentication, Settings: turn on email enumeration protection, and consider App Check.
8. Change the admin password if it was ever shared or weak, and turn on 2-step verification for the Google account that owns the Firebase project.

I could not run the rules in the Firebase emulator here. Step 5 is not optional.

## 5. Items I could not do or check

- Git history: the zip has no `.git` folder. Run `gitleaks detect` or `trufflehog git file://.` in your repo. No `.env`, key file or service-account file is in the zip.
- Dependencies: no network here. Run `npm audit` and `npm outdated`. `package.json` uses Capacitor 6; Firebase is loaded from the CDN at version 12.1.0, so check for a newer version.
- Third-party files (Font Awesome from cdnjs, Google Fonts) have no integrity hashes. Self-hosting them would remove that risk.
- Security headers: GitHub Pages cannot set HTTP headers. The meta CSP works but allows inline scripts, and `frame-ancestors`, HSTS and X-Frame-Options are not possible. Moving to Firebase Hosting or Cloudflare would allow real headers.
- Passwords: teacher and admin passwords are hashed by Firebase Auth. Students and parents have no passwords.
- Rate limiting: there is none on the student and parent login (it cannot be done in static files). Firebase limits admin and teacher attempts.
- Custom domain: add a `CNAME` file and DNS records, then turn on Enforce HTTPS in GitHub Pages settings.
- The app text mixes English and romanised Hindi.
- Not checked: text over gradient or image backgrounds (the automatic check skips them), image rights (the logo is the only photo-like asset), the add and edit pop-up forms on admin pages, and anything that depends on your real database contents. Tests used a fake in-memory Firebase, not your live project.
- Not changed: the colourful gradient in your logo itself.

## 6. Legal pages: please confirm

- The refund terms (cases covered, 7 working days) and the privacy wording about retention are my drafts. Change anything that is not how you run things.
- Business details: only your email is listed. Add a postal address or phone if you want them shown.
- DPDP: the main obligations start on 14 May 2027. Records of children under 18 need verifiable parental consent, with an exemption for educational institutions in limited cases. Whether that exemption covers a private tutor is a question for a lawyer.
- Check that your Firebase project's data location (shown in Firestore settings) is described correctly in the privacy page.
