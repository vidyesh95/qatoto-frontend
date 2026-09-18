# Civic Pulse: Data Retention & Lifecycle Policy

> **Specification**: `docs/DATA_RETENTION.md`  
> **Authority**: Qatoto Data Governance & Compliance Team  
> **Parent Document**: [docs/CIVIC_PULSE_PROBLEM_MAPPING.md](./CIVIC_PULSE_PROBLEM_MAPPING.md)

---

> ## ⚠️ Correction header — read this before the document below
>
> **Status: THE COORDINATE AND IP ROWS ARE MOOT. THE MEDIA ROW IS UNBUILT. NOTHING HERE RUNS.**
>
> - ⚠️ **"Exact GPS Coordinates (1e-6 deg) — 90 Days" DESCRIBES DATA THAT IS NEVER COLLECTED.**
>   The client sends free text and, once a pin exists, a 3-decimal (~110 m) coordinate it rounded
>   itself. §3.1's `UPDATE problem_submission SET exact_latitude_microdegrees = ROUND(…)` targets
>   columns that do not exist. Data you do not hold needs no purge schedule — that is the point of
>   the decision, not a gap in it.
> - ⚠️ **"Raw Ingest IP Hashes — 30 Days" — there is no `reporterIpHash` column.** Abuse control on
>   `POST /discovery/problem-reports` is `requireIdentifiedUser` plus `problemReportLimiter`
>   (10 per 15 minutes), not a stored hash.
> - ⚠️ **"Processed Problem Photos — 2 Years" — problem reports carry no media.** No attachment
>   route, table or column exists. The row becomes real only if `todo.md` §19 item 5 is built.
> - ⚠️ **§4's `pnpm run check:data-retention-compliance` IS NOT A SCRIPT IN EITHER REPO.**
> - ✅ **WHAT IS TRUE TODAY:** cluster centroids and aggregate counts are anonymous and retained
>   indefinitely, which is §3.3 and needs no job. `geocode_cache` is also permanent, and
>   deliberately so — see `CIVIC_PULSE_PROBLEM_MAPPING.md`'s correction header.

## 1. Principles of Data Minimization

In alignment with global privacy principles (GDPR Article 5(1)(e) and India's DPDP Act Section 8(7)), personal data must not be kept in a form which permits identification of data subjects for longer than is necessary for the purposes for which the personal data are processed.

Civic Pulse distinguishes between **ephemeral personal telemetry** (which is rapidly purged) and **longitudinal anonymous infrastructure intelligence** (which is retained permanently).

---

## 2. Retention Schedule Matrix

```
┌─────────────────────────────────────┬───────────────────┬───────────────────┬──────────────────────────────────────────┐
│ Data Asset                          │ Classification    │ Retention Period  │ Post-Retention Action                    │
├─────────────────────────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Exact GPS Coordinates (1e-6 deg)    │ Confidential PII  │ 90 Days           │ Hard Purge / Quantize to 4 decimals (~11m│
├─────────────────────────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Raw Ingest IP Hashes & Headers      │ Security Audit    │ 30 Days           │ Automated Deletion from Redis/Postgres   │
├─────────────────────────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Processed Problem Photos / Thumbnails│ Public Media     │ 2 Years           │ Archive to Cold Storage / Delete if stale│
├─────────────────────────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Problem Cluster Geometry & Centroids│ Anonymous Public  │ Indefinite        │ Retained for longitudinal infrastructure │
├─────────────────────────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Country Feasibility Scores & Model  │ Market Intel      │ Indefinite        │ Versioned historical archiving (v1.0.0..)│
└─────────────────────────────────────┴───────────────────┴───────────────────┴──────────────────────────────────────────┘
```

---

## 3. Data Asset Lifecycles

### 3.1 Raw Coordinates (`exactLatitudeMicrodegrees`, `exactLongitudeMicrodegrees`)

- **Retention**: **90 Days** from submission timestamp.
- **Operational Rationale**: High-precision coordinates are only required during the initial ingestion, real-time spatial deduplication, and weekly HDBSCAN density clustering runs. Once a cluster centroid has stabilized, retaining 11-centimeter precision creates ongoing liability.
- **Purge Mechanism**:
  A scheduled nightly SQL job updates records where `submitted_at < NOW() - INTERVAL '90 days'`:
    ```sql
    UPDATE problem_submission
    SET
      exact_latitude_microdegrees = ROUND(exact_latitude_microdegrees, -2),  -- Quantize
      exact_longitude_microdegrees = ROUND(exact_longitude_microdegrees, -2),
      accuracy_meters = NULL,
      raw_coordinates_purged_at = NOW()
    WHERE
      submitted_at < NOW() - INTERVAL '90 days'
      AND raw_coordinates_purged_at IS NULL;
    ```

### 3.2 Media Attachments & Photographs

- **Retention**: **2 Years**, or **90 Days after cluster resolution**.
- **Operational Rationale**: Photographs provide essential ground proof of infrastructure failures. However, maintaining image hosting indefinitely imposes storage costs and increases the risk of hosting out-of-date or resolved road conditions.
- **Resolution Workflow**:
  When a civic problem is marked `resolved` (e.g. municipal authorities repair a collapsed bridge or patch potholes):
    - Media remains visible in the resolved state for 90 days.
    - After 90 days, image objects are removed from the CDN/bucket, and the record displays an archival badge: _"Photo removed upon verified problem resolution."_

### 3.3 Aggregated Clusters & Market Intelligence

- **Retention**: **Permanent / Indefinite**.
- **Operational Rationale**: Clustered data stripped of personal identifiers (e.g. _"Between 2024 and 2026, 340 citizens reported severe water logging in East Bengaluru"_) constitutes essential open-source historical infrastructure telemetry and market research for hardware founders.

---

## 4. Compliance Auditing & Verification

A weekly automated audit script verifies that no records older than 90 days retain unquantized coordinate precision:

```bash
# Automated pipeline health check (runs in GitHub Actions / Kubernetes CronJob)
pnpm run check:data-retention-compliance
```

If any unpurged records older than 90 days are identified, the job triggers an immediate high-priority Sentry alert to the infrastructure security team.
