# The backend documents live in the backend repo

`qatoto-frontend/docs/` used to carry **copies** of six `qatoto-backend/docs/` files. They were
deleted on 2026-08-27 rather than re-synced, and this file replaces them.

| Document                       | Lives at                                           |
| ------------------------------ | -------------------------------------------------- |
| `BACKEND_STRUCTURE.md`         | `qatoto-backend/docs/BACKEND_STRUCTURE.md`         |
| `HOME_BACKEND_STRUCTURE.md`    | `qatoto-backend/docs/HOME_BACKEND_STRUCTURE.md`    |
| `STORE_BACKEND_STRUCTURE.md`   | `qatoto-backend/docs/STORE_BACKEND_STRUCTURE.md`   |
| `R_AND_D_BACKEND_STRUCTURE.md` | `qatoto-backend/docs/R_AND_D_BACKEND_STRUCTURE.md` |
| `STUDIO_BACKEND_STRUCTURE.md`  | `qatoto-backend/docs/STUDIO_BACKEND_STRUCTURE.md`  |
| `ESCROW_LEDGER_STRUCTURE.md`   | `qatoto-backend/docs/ESCROW_LEDGER_STRUCTURE.md`   |

`AUTH_SETUP.md` is there too and was never forked here.

**The register said four. It was six** — `STUDIO_BACKEND_STRUCTURE.md` was 45 lines behind, and
`ESCROW_LEDGER_STRUCTURE.md` was byte-identical, which is a fork that has not drifted YET rather
than one that will not.

⚠️ **`STUDIO_PRODUCTS_BACKEND_STRUCTURE.md` and `ADMIN_STRUCTURE.md` STAY.** Despite the names, they
exist only in this repo and have no upstream — deleting them would lose the only copy.

## Why they were deleted rather than brought up to date

**They had drifted, and the size of the drift is the argument.** At deletion:

| Document                       | Copy here | Real one | Behind by     |
| ------------------------------ | --------- | -------- | ------------- |
| `HOME_BACKEND_STRUCTURE.md`    | 820       | 1396     | **576 lines** |
| `STORE_BACKEND_STRUCTURE.md`   | 4692      | 4810     | 118           |
| `BACKEND_STRUCTURE.md`         | 1104      | 1218     | 114           |
| `R_AND_D_BACKEND_STRUCTURE.md` | 5326      | 5329     | 3             |
| `STUDIO_BACKEND_STRUCTURE.md`  | 1636      | 1681     | 45            |
| `ESCROW_LEDGER_STRUCTURE.md`   | 369       | 369      | 0 — not yet   |

576 lines is not a stale paragraph. The copy of `HOME_BACKEND_STRUCTURE.md` here predated the
channel page, the channel directory, the creator self-reads and the video-document routes — so a
reader who consulted it got confident, detailed, wrong answers about routes that exist.

**Re-syncing puts them back in a state that decays from the next commit.** Nobody updated them: they
sat unchanged through eleven rounds of backend work in which the originals were edited repeatedly.
A fork that nobody updates is worse than no copy, because no copy sends you to the source and a
stale copy answers you.

**`CLAUDE.md` already states the principle** for the schema, and it generalises: the authority is
`src/db/schema.ts` in the backend repo and the service code beside it — "**never a doc**, which
drifts". These four were the proof of that sentence.

## What to do instead

Read them in the backend repo, where they are edited in the same commit as the code they describe.
Code comments here cite them **by name** (`R_AND_D_BACKEND_STRUCTURE.md` Appendix D,
`HOME_BACKEND_STRUCTURE.md` §3.3a, and so on) — those citations are still correct; only the location
moved. A comment that says `docs/…` means the backend's `docs/`.

⚠️ **Do not re-add a copy.** If a frontend surface needs a backend fact often enough that reaching
for the other repo hurts, put the fact in the code that depends on it, next to the code — which is
where this repo keeps its reasoning anyway.
