# Qatoto Backend Resources

Trusted sources for building the Express auth backend. Prefer these over random blog
posts — they're maintained by the people who build the tools, or by recognised security bodies.

## Knowledge

- [Express — Hello World & Routing Guide](https://expressjs.com/en/starter/hello-world.html)
  The official getting-started + routing docs. Use for: your first server, routes, middleware.
- [Express — Using middleware](https://expressjs.com/en/guide/using-middleware.html)
  What middleware is and how `app.use` / `next()` work. Use for: `requireAuth`, `cors`, body parsing.
- [The Copenhagen Book](https://thecopenhagenbook.com/)
  A modern, framework-agnostic, beginner-readable guide to doing auth _correctly_ —
  sessions, password hashing, OTPs, cookies. **This is your primary source for auth concepts.**
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  The security authority's checklist. Use for: password rules, generic login errors, lockouts.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  Use for: cookie flags (httpOnly, Secure, SameSite), session expiry, why not localStorage.
- [MDN — HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
  and [HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).
  Use for: choosing GET vs POST, and 200/201/400/401/409/429.
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
  Use for: understanding Set-Cookie, httpOnly, SameSite in plain terms.
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
  Use for: `db.prepare(...).run/get/all`. Simple, synchronous, beginner-friendly SQLite.
- [bcrypt (node) README](https://github.com/kelektiv/node.bcrypt.js#readme)
  Use for: `bcrypt.hash` / `bcrypt.compare`.
- [TanStack Query — Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
  and [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations).
  Use for: the frontend side — `useQuery(['auth','me'])`, `useMutation` for login, `invalidateQueries`.
- [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
  Use for: why the browser blocks cross-origin calls and what the `cors` middleware fixes.

## Wisdom (Communities)

- [r/node](https://www.reddit.com/r/node/) — Node/Express questions, code review, beginner-friendly threads.
- [Stack Overflow `[express]` tag](https://stackoverflow.com/questions/tagged/express) — search before you ask; most beginner errors are already answered.
- [The Copenhagen Book GitHub Discussions](https://github.com/pilcrowonpaper/copenhagen) — for deeper auth questions, from the people who wrote the guide.

> No community-joining preference recorded yet. Tell your teacher if you'd rather not, and this section will stop suggesting them.

## Gaps

- No single beginner walkthrough that matches _this exact_ OTP+password+session shape — that's
  what the lessons in `./lessons/` are for. Your teacher builds those to fit the mission.
