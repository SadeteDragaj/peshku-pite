/* Timestamps from the API are UTC. SQLite (used in dev/tests) drops the offset, so treat
 * an ISO string without one as UTC instead of local time. */
export const toDate = (iso: string) => new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`);
export const toMs = (iso: string) => toDate(iso).getTime();
