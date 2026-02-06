/** returns 19:00 UTC in the user's timezone (1 hour after github actions starts) */
export const SYNC_TIME = new Intl.DateTimeFormat(navigator.languages, {
  weekday: "long",
  hour: "numeric",
  timeZoneName: "short",
}).format(new Date("2019-01-02T19:00:00Z")); // pick a random Wednesday
