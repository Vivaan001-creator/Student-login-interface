# Online MCQ tests

Files: `tests.js`, `tests.css`, `teacher-tests.html`, `student-tests.html`, `parent-tests.html`, new rules in `firestore.rules`, entry cards on the three dashboards, release note in `whats-new.json`.

## How it works
- **Teacher** (Dashboard > Tests): choose class, subject, start date and time, duration in minutes and marks per question; add MCQs (4 options, one correct); Publish. Total marks = questions x marks per question. Results show every student's marks, average, highest, and who did not attempt. A test can be deleted (its results go with it).
- **Student**: each test is a card. Subject in bold, duration / marks / questions in small text, and an arrow on the right. The arrow stays disabled until the start time. The arrow opens the verification form (name, father's name, date of birth, mobile number, checked against the school record). Then the questions open.
- **Leaving the test screen** (another app, tab, home button, window blur) erases the verification and every answer; the student must fill all details again. The test end time does not move.
- **Submit** (or automatic submit when time ends): the score is worked out, correct answers show green, wrong answers red. One attempt only.
- **Report**: visible to the student, to the parent (parent dashboard > Tests) and to the teacher.

## Deploy
1. Publish the new `firestore.rules` in Firebase Console > Firestore > Rules (the tests will not save without it).
2. Upload all files. `whats-new.json` already announces the feature.

## Limits (be aware)
- Students and parents are not Firebase users, so the browser must be able to read the answer key and write its own score. The key is locked until the test start time, and each student can submit once, but a technical student could read the key during the test or send a false score. For exams that count, move scoring to a Cloud Function (Blaze plan).
- The test runs in one fixed window: start time to start time + duration. A student who joins late gets the remaining time. Submissions are accepted up to 3 minutes after the end.
- The start-time lock on the questions uses the server clock; the arrow and countdown use the phone clock.
- Leaving detection relies on the browser reporting that the page lost focus. Some phones also report this for the notification shade or a call, which will reset the test.
- No negative marking, no images in questions, a published test cannot be edited (delete and publish again).
