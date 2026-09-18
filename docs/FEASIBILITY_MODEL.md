# Civic Pulse: Startup Feasibility & Market Opportunity Model

> **Specification**: `docs/FEASIBILITY_MODEL.md`  
> **Model Version**: `v1.0.0`  
> **Schema Authority**: `CountryProblemInsightSchema` in `src/lib/rnd/discovery.schemas.ts`  
> **Parent Document**: [docs/CIVIC_PULSE_PROBLEM_MAPPING.md](./CIVIC_PULSE_PROBLEM_MAPPING.md)

---

> ## ⚠️ Correction header — read this before the document below
>
> **Status: THE FOUR PILLARS ARE KEPT. THE COMPOSITE SCORE AND THE VERDICT ENUM ARE REJECTED.**
> Nothing here is built.
>
> - ⚠️ **§2's single 0–100 `S_feasibility` IS NOT SHIPPING.** `R_AND_D_STRUCTURE.md` §7 already
>   rules that the two evidence bases "are never merged into one number… There is no join on the
>   wire", and says why the identical five-field shape of demand signals and localization
>   assessments "is exactly what makes averaging them tempting and wrong". Pillar 1 is Qatoto's own
>   cluster data and pillars 2–4 are World Bank and UN Comtrade; summing them is that join, done
>   with weights.
> - ⚠️ **§4's `feasibilityRating` ENUM IS REJECTED OUTRIGHT.** `cofounders.schemas.ts` records the
>   reasoning for the identical field — "a renderer that requires one invites people to invent one"
>   — and the case-study `scaled | failed | pivoted` badge was rejected as "an unattributed
>   JUDGMENT, which PRODUCT.md bans harder than an unattributed number". Stamping
>   `ngo_grant_target` on a real country is that failure at national scale.
> - ✅ **WHAT IS KEPT:** the four pillars, their concrete sources, the per-pillar formulas, and
>   §5's confidence bands. They render as **four bounded readouts, side by side, never summed**,
>   each carrying its own source name and its own `asOf` — because the four data sources have four
>   different vintages and one number would hide all four.
>
> ```
> Kenya · agriculture_rural/cold_storage_loss
>   Need density      24 / 30   Qatoto clusters   2026-09
>   Purchasing power  11 / 25   World Bank PPP    2025
>   Manufacturing     17 / 25   UN Comtrade HS6   2025
>   Regulatory        13 / 20   B-READY           2024
> ```
>
> §5.2's `modelVersion` / `computedAt` / `dataSnapshotDates` survive and apply per component.

## 1. Executive Summary

A core requirement of Civic Pulse is answering: **"Which country is facing which problem, and what kind of startup can be built around it, or is it feasible?"**

Raw problem mapping shows _where pain exists_, but pain alone does not guarantee a viable business. An unpaved road in a low-income agricultural belt might represent severe human distress, but if local purchasing power cannot sustain private road-toll units and the municipality has a zero capital-works budget, launching a VC-backed commercial startup is non-viable. Conversely, a recurrent cold-chain crop loss in a high-export horticulture corridor presents immense commercial potential for a decentralized solar-refrigeration startup.

This document formalizes the **mathematical formula, concrete data sources, scoring pillars, and confidence intervals** that compute the **Startup Feasibility Score (0–100)** for every country-problem pair on Qatoto.

---

## 2. Mathematical Formulation

The composite Startup Feasibility Score $S_{\text{feasibility}} \in [0, 100]$ is computed as a weighted linear combination of four normalized sub-scores:

$$S_{\text{feasibility}} = w_d \cdot S_{\text{density}} + w_t \cdot S_{\text{tam}} + w_m \cdot S_{\text{mfg}} + w_r \cdot S_{\text{reg}}$$

Where the operational weights are bounded by $\sum w_i = 1.0$:

$$ \begin{aligned}
w_d &= 0.30 \quad (\text{Unmet Need Density}) \\
w_t &= 0.25 \quad (\text{Purchasing Power \& Addressable Market}) \\
w_m &= 0.25 \quad (\text{Manufacturing \& Supply Chain Feasibility}) \\
w_r &= 0.20 \quad (\text{Regulatory Clarity \& Institutional Friction})
\end{aligned}$$

---

## 3. The Four Scoring Pillars & Concrete Data Sources

```
┌─────────────────────────┬────────┬────────┬──────────────────────────────────────────┬──────────────────────────────────────────┐
│ Pillar                  │ Symbol │ Weight │ Concrete Authoritative Source            │ Measurement Metric                       │
├─────────────────────────┼────────┼────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ 1. Unmet Need Density   │ S_dens │ 30%    │ Qatoto Internal problem_cluster Table    │ log10(distinctReporters) * clusterDensity│
│ 2. TAM & Willingness    │ S_tam  │ 25%    │ World Bank API (NY.GDP.PCAP.PP.CD)       │ GDP PPP per capita * affected population │
│ 3. Manufacturing / ODM  │ S_mfg  │ 25%    │ UN Comtrade HS6 + Qatoto ODM Directory   │ Domestic capability vs import tariff     │
│ 4. Regulatory Readiness │ S_reg  │ 20%    │ World Bank B-READY (Doing Business)      │ Permitting latency & private utility law │
└─────────────────────────┴────────┴────────┴──────────────────────────────────────────┴──────────────────────────────────────────┘
```

### Pillar 1: Unmet Need Density ($S_{\text{density}}$, 0–30 Points)
* **Objective**: Measure the geographical concentration and public urgency of the problem.
* **Authoritative Source**: Qatoto's verified `problem_cluster` and `problem_submission` database.
* **Formula**:
  $$S_{\text{density}} = 30 \cdot \min\left(1.0, \frac{\log_{10}(N_{\text{reporters}} + 1)}{3.0}\right) \cdot \left(0.4 + 0.6 \cdot \frac{C_{\text{active}}}{C_{\text{total}}}\right)$$
  Where:
  * $N_{\text{reporters}}$ is the count of distinct verified people who reported the problem.
  * $C_{\text{active}}$ is the count of active spatial clusters within the country.
  * $C_{\text{total}}$ is the total historical clusters recorded in that category.
* **Interpretation**: A single viral post cannot score high; widespread reports across multiple regional clusters are required to demonstrate national market demand.

### Pillar 2: Addressable Market & Purchasing Power ($S_{\text{tam}}$, 0–25 Points)
* **Objective**: Determine whether private customers, local enterprises, or municipal agencies can afford to pay for a solution.
* **Authoritative Sources**:
  * World Bank Data API: Indicator `NY.GDP.PCAP.PP.CD` (GDP per capita, PPP in current international $).
  * IMF World Economic Outlook (WEO) municipal capital expenditure metrics.
* **Formula**:
  $$S_{\text{tam}} = 25 \cdot \min\left(1.0, \frac{\text{GDP}_{\text{PPP\_per\_capita}}}{45,000}\right) \cdot \left(0.5 + 0.5 \cdot \log_{10}(\text{Population}_{\text{affected\_k}})\right)$$
* **Interpretation**: Identifies whether the customer segment has disposable income or credit access to amortize hardware investments (e.g. pay-as-you-go micro-utilities).

### Pillar 3: Manufacturing & Supply Chain Feasibility ($S_{\text{manufacturing}}$, 0–25 Points)
* **Objective**: Evaluate whether the physical hardware required to solve this problem can be manufactured, assembled, or imported economically in this country.
* **Authoritative Sources**:
  * UN Comtrade HS6 Database: National import value and customs duty rates for corresponding hardware commodities (e.g. HS 8418 for refrigeration, HS 8504 for inverters, HS 8421 for water filtration).
  * Qatoto Verified ODM / Contract Manufacturer Directory (`src/lib/rnd/catalog.schemas.ts`).
  * World Integrated Trade Solution (WITS) average applied tariff rates.
* **Formula**:
  $$S_{\text{manufacturing}} = 25 \cdot \left(0.5 \cdot M_{\text{domestic\_odm}} + 0.3 \cdot (1.0 - T_{\text{tariff\_rate}}) + 0.2 \cdot C_{\text{component\_availability}}\right)$$
  Where:
  * $M_{\text{domestic\_odm}} \in \{0.2, 0.6, 1.0\}$ indicates whether domestic contract manufacturers exist on Qatoto for this category.
  * $T_{\text{tariff\_rate}}$ is the national customs duty on key bill-of-materials components.
  * $C_{\text{component\_availability}}$ measures port/freight logistics turnaround days.

### Pillar 4: Regulatory Clarity & Institutional Friction ($S_{\text{regulatory}}$, 0–20 Points)
* **Objective**: Assess whether a private startup can operate legally without utility monopoly blockades or bureaucratic paralysis.
* **Authoritative Sources**:
  * World Bank B-READY (Business Ready) Project (successor to Doing Business).
  * National Energy Regulatory Authority (NERA) decentralized mini-grid policy ratings.
* **Formula**:
  $$S_{\text{regulatory}} = 20 \cdot \left(\frac{\text{Score}_{\text{B-READY}}}{100}\right) \cdot F_{\text{sector\_liberalization}}$$
  Where $F_{\text{sector\_liberalization}} \in [0.1, 1.0]$ measures whether private entities are legally permitted to generate power, sell potable water, or build localized municipal infrastructure.

---

## 4. Problem Severity vs. Commercial Viability

To prevent ethical and analytical missteps, Qatoto enforces an explicit separation between **Human Distress / Problem Severity** and **Commercial Startup Feasibility**:

```
                              High Problem Severity
                                       │
                NGO / Public Policy    │    Commercial Startup
                Intervention Target    │    High Feasibility
                                       │
            (Subsidies, Civic Grants,  │   (Hardware Startups, VC,
             Multilateral Aid)         │    Crowdfunding, Cap Table)
 ◄─────────────────────────────────────┼─────────────────────────────────────►
 Low Purchasing Power                  │                  High Purchasing Power
                                       │
                Low Commercial Return  │    Niche Commercial
                Deprioritized          │    Opportunistic Target
                                       │
                                       ▼
                              Low Problem Severity
```

### Classification Verdicts (`feasibilityRating`)
1. **`high_feasibility`** ($S \ge 75$): Clear customer demand, established local manufacturing supply chain, solvent addressable market, and transparent regulatory frameworks. Direct candidate for Qatoto Stage 01 (Founder Team Matching & Crowdfund Raise).
2. **`moderate_feasibility`** ($55 \le S < 75$): Viable market, but requires capital expenditure assembly or supply chain importation. Recommended for experienced hardware operators.
3. **`hard_tech_required`** ($40 \le S < 55$): High severity, but existing ODM technology is too expensive or unsuited; requires novel R&D before commercial production.
4. **`ngo_grant_target`** ($S_{\text{density}} \ge 20$, but $S_{\text{tam}} + S_{\text{regulatory}} < 20$): Severe real-world infrastructure failure in an economically marginalized zone. Tagged for philanthropic capital, non-profit deployment, and municipal open-source hardware rather than commercial equity pitches.

---

## 5. Statistical Confidence & Model Versioning

### 5.1 Sample Size & Confidence Bands
A single isolated complaint cannot declare a country "high feasibility." Feasibility ratings carry a mandatory `confidence` rating:

| Distinct Reporters ($N$) | Active Clusters ($C$) | Confidence Rating | UI Representation |
| :--- | :--- | :--- | :--- |
| $N < 5$ | $C = 1$ | `low` | Dotted ring; explicitly marked "Early signal — gathering reports" |
| $5 \le N < 25$ | $1 \le C \le 3$ | `medium` | Solid amber ring; "Moderate confidence" |
| $N \ge 25$ | $C \ge 3$ | `high` | Solid high-contrast badge; "Statistically verified market demand" |

### 5.2 Model Versioning & Auditing
Every computed insight stores:
* `modelVersion`: Semantic version (e.g. `"v1.0.0"`).
* `computedAt`: Timestamp of calculation run.
* `dataSnapshotDates`: Record of underlying World Bank and UN Comtrade ingest dates.

If the scoring formula is adjusted, the model version increments (`v1.1.0`), and previous scores remain historically archived to preserve an honest, tamper-evident record of how recommendations were made.
$$
