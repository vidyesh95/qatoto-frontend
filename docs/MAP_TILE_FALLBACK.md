# Civic Pulse: Map Tile Architecture & Fallback Runbook

> **Specification**: `docs/MAP_TILE_FALLBACK.md`  
> **Map Engine**: [MapLibre GL JS](https://maplibre.org/)  
> **Primary Tile Provider**: [OpenFreeMap](https://openfreemap.org/)  
> **Parent Document**: [docs/CIVIC_PULSE_PROBLEM_MAPPING.md](./CIVIC_PULSE_PROBLEM_MAPPING.md)

---

## 1. Overview & SLA Reality

Civic Pulse uses **MapLibre GL JS** combined with **OpenFreeMap** vector tiles to eliminate the excessive licensing fees and billing risks of Google Maps.

However, public free tile services—including `tiles.openfreemap.org`—are community-operated and do not guarantee a commercial Service Level Agreement (SLA). If the primary tile server experiences upstream DDoS attacks, hardware failure, or DNS interruptions, an unhardened frontend renders a completely blank gray canvas.

This document establishes the **three-tier tile resilience architecture**, automated client-side failover, and the self-hosted **PMTiles-on-Cloudflare R2** deployment path.

---

## 2. The Three-Tier Tile Resilience Hierarchy

```
┌─────────────────────────┬───────────────────────────────────┬──────────────────────────────────────────┐
│ Tier                    │ Provider / Source                 │ Cost & SLA Profile                       │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ Tier 1: Primary Vector  │ OpenFreeMap (tiles.openfreemap.org│ 100% Free, Zero API Keys, Public CDN     │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ Tier 2: Hot Fallback    │ MapTiler Cloud / Protomaps        │ Free tier (50k requests/mo), High SLA    │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ Tier 3: Self-Hosted PMT │ Cloudflare R2 + Cloudflare Worker │ Total Independence, ~$0.015/GB egress    │
└─────────────────────────┴───────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Automated Client-Side Hot Failover

MapLibre GL fires an `error` event when vector tile requests fail. The `MapLibreCanvas` component catches persistent 5xx or network errors and automatically switches the active map style without requiring a page reload:

```typescript
"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

const PRIMARY_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const FALLBACK_STYLE_URL = "https://api.maptiler.com/maps/streets-v2/style.json?key=FALLBACK_KEY";

export function useResilientMapStyle() {
    const [activeStyleUrl, setActiveStyleUrl] = useState(PRIMARY_STYLE_URL);
    const failureCountRef = useRef(0);

    const handleTileError = (map: maplibregl.Map, errorEvent: maplibregl.ErrorEvent) => {
        // Only intercept tile loading HTTP failures
        if (
            errorEvent.error?.status >= 500 ||
            errorEvent.error?.message?.includes("Failed to fetch")
        ) {
            failureCountRef.current += 1;

            // If more than 3 tiles fail consecutively, hot-swap to fallback style
            if (failureCountRef.current >= 3 && activeStyleUrl !== FALLBACK_STYLE_URL) {
                console.warn(
                    "[CivicPulse Map] Primary tile provider down. Hot-swapping to Tier-2 fallback style.",
                );
                setActiveStyleUrl(FALLBACK_STYLE_URL);
                map.setStyle(FALLBACK_STYLE_URL);
            }
        }
    };

    return { activeStyleUrl, handleTileError };
}
```

---

## 4. The Self-Hosted PMTiles-on-Cloudflare R2 Path

For absolute institutional autonomy, Qatoto can host its own global OpenStreetMap vector tile archive using **PMTiles** (a single-file archive format for tiled spatial data).

### 4.1 How PMTiles on Object Storage Works

Instead of maintaining a fleet of running Docker map servers with complex tile caching databases:

1. A single pre-rendered `planet.pmtiles` file ($\sim 110\text{ GB}$ for global roads and terrain) is uploaded to **Cloudflare R2** (which features zero egress fees).
2. A lightweight **Cloudflare Worker** uses HTTP Range Requests to read only the exact 256-byte vector byte-chunks requested by the user's browser zoom and pan.
3. MapLibre GL renders the tiles directly using the official `pmtiles` protocol plugin.

### 4.2 Step-by-Step Deployment Runbook

#### Step 1: Download the Global PMTiles Extract

```bash
# Download latest global OpenStreetMap planet extract via Protomaps / OpenFreeMap builds
curl -O https://build.protomaps.com/20260901.pmtiles
```

#### Step 2: Upload to Cloudflare R2

```bash
# Using AWS CLI configured with Cloudflare R2 endpoint
aws s3 cp 20260901.pmtiles s3://qatoto-map-tiles/planet.pmtiles \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

#### Step 3: Register the PMTiles Protocol in the Frontend

```typescript
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";

// Register PMTiles protocol handler once before map initialization
const pmtilesProtocol = new Protocol();
maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);

// Style references the self-hosted R2 bucket via worker
const SELF_HOSTED_STYLE = {
    version: 8,
    sources: {
        protomaps: {
            type: "vector",
            url: "pmtiles://https://tiles.qatoto.com/planet.pmtiles",
        },
    },
    layers: [/* standard vector styling layers */],
};
```

---

## 5. Summary & Operational Recommendation

1. **Deploy Tier 1 (OpenFreeMap) as default**: Delivers zero operating costs and high speed out of the box.
2. **Keep Tier 2 (MapTiler) hot-standby**: Ensures that if OpenFreeMap suffers temporary maintenance, end users notice zero interruption.
3. **Execute Tier 3 (Cloudflare R2 PMTiles) when scale exceeds 500,000 monthly active users**: Provides complete sovereign control with negligible infrastructure costs (~$1.50/month storage on R2).
