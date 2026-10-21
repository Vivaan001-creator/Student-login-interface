# How to tell everyone about an update

Every time you upload new files, you can tell all students, parents, teachers and the admin what changed.
Everything is controlled by one file: `whats-new.json`.

## Steps

1. Open `whats-new.json`.
2. Change the top `"version"` to a new value, for example `"2026.11.02"`, and use the same value in the releases you add.
3. Add a release at the top of `"releases"` for each group of people it affects. Every release has a `"roles"` list, and **people only ever see releases for their own role**:

       {
         "version": "2026.11.02",
         "date": "2026-11-02",
         "roles": ["teacher"],
         "title": "Short title of the update",
         "notes": [ "First thing that changed.", "Second thing that changed." ]
       }

   - `roles` can include `student`, `parent`, `teacher`, `admin`. Use `["student", "parent"]` when the same note is meant for both.
   - If one change affects two groups differently, write two releases with the same `version` and different `roles`, and word each note for that group.
   - A release for teachers never shows a red dot, a banner or a notification to students, parents or the admin. A role with no release for a version is not told about it at all.
   - Releases without `roles` go to everyone. Use that only for changes everybody should hear about.
   - Keep releases newest first.

4. For each new feature you want people to notice, add an entry to `"features"`:

       { "id": "unique-name", "roles": ["parent", "student"], "target": ".css-selector-of-the-button",
         "title": "Feature name", "text": "One sentence on what it does." }

   - `id` must be new and never reused. It decides whether a device has already seen the highlight.
   - `roles` can be `student`, `parent`, `teacher`, `admin`.
   - `target` is a CSS selector for the button or card to highlight, on that role's dashboard.
5. Check the file is valid: run `python3 -m json.tool whats-new.json` (no error means it is valid).
6. Upload `whats-new.json` together with the other changed files.

## What people see

- **Student and parent:** the bell on the dashboard gets a blinking red dot, but only if there is a release for their role. Opening the bell shows only their own update notes.
- **Teacher and admin:** a "What's new" bar appears under the header, again only for their own releases.
- **Highlight:** each new feature glows once with a NEW tag, then goes back to normal after the person taps Got it (or after 15 seconds).
- **Open apps** notice the new version within about 5 minutes. Phones that are closed see it the next time the app is opened.
- A device that allowed notifications also gets a phone notification when the app is open in the background.

## New notices

Post a notice from the Notice Board as usual. On a student or parent device that is open, a message appears. The bell and the Notices tab get a blinking red dot until the notice has been seen.

## New tests

When a teacher publishes a test, students and parents of that class get the same treatment: a message if the app is open, a blinking red dot on the bell, and a New test entry in the bell panel. A device with notifications allowed also gets a phone notification if the app is in the background.

## Limit

Notifications reach a phone only while the app or browser tab is open or in the background. Waking a phone that has the app fully closed needs a push server (Firebase Cloud Messaging with a Cloud Function, which requires the Blaze plan).
