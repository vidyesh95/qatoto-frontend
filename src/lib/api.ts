/**
 * Base URL of the Express backend. Override with `NEXT_PUBLIC_API_URL`.
 *
 * THE TRAILING SLASH IS STRIPPED, and that is not cosmetic. Every caller builds its URL as
 * `` `${API_BASE_URL}${path}` `` with a path that already starts with `/`, so a base ending in `/`
 * produces `https://host//store/home`. Express does not treat that as the same route, so the whole
 * store would 404 against a correctly-deployed backend — and the value in `.env` is written with
 * the trailing slash a copy-paste from a hosting dashboard gives you.
 */
const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const API_BASE_URL = CONFIGURED_API_URL.replace(/\/+$/, "");
