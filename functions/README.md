# Firebase Functions

This folder hosts the private admin Apple Calendar subscription feed.

## Required secret

Set a signing key before deploying:

```sh
firebase functions:secrets:set CALENDAR_FEED_SIGNING_KEY
```

Use a long random value. The feed URL token is signed with this secret, and the
React admin dashboard retrieves the signed URL through the authenticated
`adminCalendarFeedUrl` callable function.

## Optional environment variables

- `ADMIN_APP_BASE_URL`: Admin links embedded in calendar descriptions.
  Defaults to `https://ormusicevents.com`.
- `CALENDAR_FEED_BASE_URL`: Fully qualified HTTPS URL for the feed endpoint.
  Defaults to the Firebase Functions URL for `adminCalendarFeed`.

## Exports

- `adminCalendarFeed`: public HTTPS `.ics` feed, protected by signed token.
- `adminCalendarFeedUrl`: callable function that returns the private feed URL
  only to authenticated users with `users/{uid}.isAdmin === true`.
