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
- Unused files renamed with an `unused-` prefix: `unused-assistant.html`, `unused-coming-soon.html`, `unused-home.js`. Nothing links to them. Because the project is now one flat folder, GitHub Pages WILL publish them, so delete them from the repo if you do not need them.
- Accessibility: every form control has a label, keyboard focus is always visible, browser pop-up alerts are replaced by on-page messages (success and error), teacher phone numbers and emails are tap-to-call and tap-to-email. Text contrast was checked automatically on every page in light and dark mode (empty-data state) and now passes. Fixed along the way: invisible text on form cards in dark mode, faint footer and bottom-nav labels, and an unreadable teacher signature in dark mode on the result page.
- Style: button corners are no longer pill shaped, purple gradients in `admin.css` are solid colours, em dashes removed.
- Images: login logo reduced from 396 KB to 178 KB. Originals are `logo-original.png` and `favicon-original.png` (delete them from the repo if you do not need them online).
- Mobile (admin): the dashboard had its page padding wiped out by a later CSS rule, so everything touched the screen edges; fixed, with a 2x2 stats grid. List cards no longer overflow their box, class teacher and payment history cells are tidy. All 19 admin pages were run against realistic mock data at 360 and 320 px wide, light and dark, with a check that no element sticks out past the screen.
- Mobile: two-column forms stack on phones. All 40 pages tested at 360 px wide with no sideways scrolling (logged-in pages tested with empty data).

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
- Not checked: text over gradient or image backgrounds (the automatic check skips them), text that only appears once real data loads, image rights (the logo is the only photo-like asset), and whether every button works with real data.
- Not changed: the colourful gradient in your logo itself.

## 6. Legal pages: please confirm

- The refund terms (cases covered, 7 working days) and the privacy wording about retention are my drafts. Change anything that is not how you run things.
- Business details: only your email is listed. Add a postal address or phone if you want them shown.
- DPDP: the main obligations start on 14 May 2027. Records of children under 18 need verifiable parental consent, with an exemption for educational institutions in limited cases. Whether that exemption covers a private tutor is a question for a lawyer.
- Check that your Firebase project's data location (shown in Firestore settings) is described correctly in the privacy page.
