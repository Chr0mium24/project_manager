export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const PROJECT_RUNTIMES = new Set(["static", "dynamic"]);
export const VISIBILITY_VALUES = new Set(["private", "unlisted"]);
export const ROUTE_RE = /^\/[A-Za-z0-9._/-]+$/;

export function isIsoDateTime(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
