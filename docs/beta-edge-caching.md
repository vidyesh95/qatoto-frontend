# Beta Edge Caching & AI Bot Protection Runbook

## Overview

This runbook documents the edge caching, bot management, and cache-invalidation architecture configured for Qatoto's transition from alpha to beta on free-tier infrastructure (Cloudflare Free + Vercel Hobby).

---

## 1. Vercel Configuration

### Domain Hardening

- **Objective**: Prevent AI crawlers and bots from bypassing Cloudflare by querying `*.vercel.app` directly.
- **Action**: In Vercel Project Settings > **Domains**:
    - Edit your default `*.vercel.app` domain (e.g., `qatoto.vercel.app`).
    - Configure **Redirect to**: `qatoto.com` (your custom production domain).
    - Status code: **308 Permanent Redirect**.

---

## 2. Cloudflare Dashboard Configuration

### Base Settings

- **SSL/TLS Mode**: **Full (strict)**.
- **Tiered Cache**: **Smart Tiered Cache** set to **ON** (Caching > Tiered Cache).

### WAF Custom Rules (Security > WAF > Custom Rules)

Create Rule: **Block AI Training Scrapers**

- **Action**: **Block**
- **Expression**:
    ```text
    (http.user_agent contains "Bytespider") or
    (http.user_agent contains "GPTBot") or
    (http.user_agent contains "ClaudeBot") or
    (http.user_agent contains "anthropic-ai") or
    (http.user_agent contains "CCBot") or
    (http.user_agent contains "meta-externalagent") or
    (http.user_agent contains "FacebookBot") or
    (http.user_agent contains "cohere-training-data-crawler") or
    (http.user_agent contains "Diffbot") or
    (http.user_agent contains "Amazonbot") or
    (http.user_agent contains "Timpibot") or
    (http.user_agent contains "ImagesiftBot") or
    (http.user_agent contains "omgili")
    ```

_(Note: `facebookexternalhit` is omitted to preserve link previews. AI search/user agents like `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot` are deliberately omitted so Qatoto can be cited in AI search answers)._

### Cache Rules (Caching > Cache Rules)

Cloudflare evaluates rules in order, but **later rules override earlier rules**. Create them in this exact order:

#### Rule 1: Cache Public HTML (Create First)

- **Expression**:
    ```text
    (http.request.method eq "GET")
    ```
- **Cache Eligibility**: **Eligible for cache**
- **Edge Cache TTL**: **Override origin** -> **1 hour**
- **Browser Cache TTL**: **Respect origin** (Next.js sends `no-store`, preventing browsers from caching stale chunk hashes)
- **Status Code TTL**:
    - `500-599`: **no-store** (never cache server errors)
    - `404`: **60 seconds**
- **Serve Stale Content while Revalidating**: **Enabled**

#### Rule 2: Cache Static Assets

- **Expression**:
    ```text
    starts_with(http.request.uri.path, "/_next/static/")
    ```
- **Cache Eligibility**: **Eligible for cache**
- **Edge Cache TTL**: **Respect origin**

#### Rule 3: Cache Robots and Sitemap

- **Expression**:
    ```text
    (http.request.uri.path in {"/robots.txt" "/sitemap.xml"})
    ```
- **Cache Eligibility**: **Eligible for cache**
- **Edge Cache TTL**: **Override origin** -> **1 hour**
- **Browser Cache TTL**: **Respect origin**

#### Rule 4: Bypass Cache for Private, Dynamic, & RSC (Create Last — Highest Precedence)

- **Expression**:
    ```text
    (http.cookie contains "better-auth.") or
    (any(lower(http.request.headers.names[*])[*] == "rsc")) or
    (http.request.uri.query contains "_rsc=") or
    (http.request.method ne "GET") or
    (starts_with(http.request.uri.path, "/api/")) or
    (starts_with(http.request.uri.path, "/admin")) or
    (starts_with(http.request.uri.path, "/studio")) or
    (http.request.uri.path in {"/cart" "/checkout" "/wishlist" "/library" "/history" "/messages" "/report-history" "/search" "/store/search" "/sign-in" "/sign-up" "/sign-in-with-password" "/forgot-password"}) or
    (starts_with(http.request.uri.path, "/orders-and-returns")) or
    (starts_with(http.request.uri.path, "/disputes")) or
    (starts_with(http.request.uri.path, "/service-engagements")) or
    (starts_with(http.request.uri.path, "/customer-service/cases")) or
    (starts_with(http.request.uri.path, "/store/rfqs")) or
    (starts_with(http.request.uri.path, "/store/quotes")) or
    (starts_with(http.request.uri.path, "/store/factory-inquiries")) or
    (ends_with(http.request.uri.path, "/new")) or
    (ends_with(http.request.uri.path, "/mine")) or
    (ends_with(http.request.uri.path, "/report")) or
    (starts_with(http.request.uri.path, "/research-and-development/my-reports")) or
    (starts_with(http.request.uri.path, "/research-and-development/applications"))
    ```
- **Cache Eligibility**: **Bypass cache**

### Rate Limiting Rules (Security > WAF > Rate Limiting)

Create Rule: **Rate Limit HTML Scrapers**

- **Expression**:
    ```text
    (not cf.client.bot) and
    (not http.cookie contains "better-auth.") and
    (not any(lower(http.request.headers.names[*])[*] == "rsc")) and
    (not starts_with(http.request.uri.path, "/_next/"))
    ```
- **Characteristics**: IP
- **Period**: **10 seconds**
- **Threshold**: **50 requests**
- **Action**: **Block for 10 seconds**

---

## 3. GitHub Actions Auto-Purge

The workflow in `.github/workflows/purge-cloudflare-cache.yml` listens for Vercel production deployment status events and automatically purges the Cloudflare zone cache upon successful deploy.

### Required GitHub Secrets:

1. `CLOUDFLARE_ZONE_ID`: Found on your Cloudflare domain overview page.
2. `CLOUDFLARE_API_TOKEN`: Created under Cloudflare Profile > API Tokens with `Zone:Cache Purge:Purge` permissions.

### Manual purge after a rollback or promote

A Vercel dashboard **Instant Rollback** or **Promote** may not emit a GitHub `deployment_status`
event, so the workflow does not run. Purge by hand right after either one (Cloudflare > Caching >
Configuration > **Purge Everything**). Otherwise cached HTML keeps pointing at the JavaScript chunks
of the deployment that is no longer live.

---

## 4. Production Verification Commands

Run these checks against your live production domain:

```bash
# 1. Verify Edge Cache HIT on public page (run twice; 2nd should be HIT)
curl -sI https://qatoto.com/research-and-development/import-intelligence/010121 | grep -i cf-cache-status

# 2. Verify Session Bypass on logged-in cookie (should be BYPASS or DYNAMIC)
curl -sI -H "Cookie: better-auth.session_token=test" https://qatoto.com/store | grep -i cf-cache-status

# 3. Verify RSC Fetch Bypass, header and query separately (both BYPASS or DYNAMIC)
#    One combined request would pass on the query clause alone and never test the header clause.
curl -sI -H "RSC: 1" https://qatoto.com/store | grep -i cf-cache-status
curl -sI "https://qatoto.com/store?_rsc=123" | grep -i cf-cache-status

# 4. Verify AI Training Scraper is Blocked (HTTP 403 Forbidden)
curl -sI -A "Bytespider" https://qatoto.com/ | head -n 1

# 5. Verify AI Search Bot is Allowed (HTTP 200 OK)
curl -sI -A "Mozilla/5.0 (compatible; OAI-SearchBot/1.0)" https://qatoto.com/ | head -n 1
```
