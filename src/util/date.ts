/** returns 7am UTC in the user's timezone */
export const SYNC_TIME = new Intl.DateTimeFormat(navigator.languages, {
  weekday: "long",
  hour: "numeric",
  timeZoneName: "short",
}).format(new Date("2019-01-01T07:00:00Z"));
