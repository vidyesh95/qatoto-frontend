# Focus areas research: proof of work, and full product R&D

_Written 2026-11-03. Follows on from `PRODUCT_REVIEW.md`. Laws, deadlines and competitor details
change fast: each one here was checked on this date, but check again before relying on it._

## The question

Should Qatoto focus on two things?

1. **Proof of work.** Everyone on a team (founders, employees, other stakeholders) uploads what
   they did each day, as a document or a video. The platform analyses it so that:
    - each person's work is measured, so they can earn cash, equity, ownership or a share of profit
    - founders can see who is strong, and who to promote, demote or let go
    - investors (VCs) can see daily progress, sales, profit margin, losses, company health and
      product health
2. **Full product R&D.** Build the complete blueprint and diagrams of a product: a package a
   manufacturer can build from.

## Short answer

**Yes, focus on these two and drop most of the rest.** They fit together:

- area 2 _makes_ the product
- area 1 _records who made it_, so they get paid or own a share fairly

But treat them differently:

|                           | Proof of work                                                                                                                                                                   | Full product R&D                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| How much is built already | **Most of it.** Daily logs, AI analysis, GitHub checks, photo-receipt checks, the equity formula, monthly pay statements, disputes and an investor score all exist in the code. | **Little.** Teardowns describe _existing_ products, not new designs. Quote requests and the factory directory exist for the last step. |
| What to do next           | **Stop adding features. Get 3 to 5 real teams using it.**                                                                                                                       | **Sell it as an engineering service first.** Use existing design tools; build only a light workspace and checklist.                    |
| Main risk                 | **Legal and trust.** Using AI to decide pay, promotion or firing is tightly regulated and makes people distrust the tool.                                                       | **Liability and skill.** A design mistake becomes a product failure. Needs real engineers; AI alone cannot do it yet.                  |
| How it earns              | Later: monthly subscription per team. Free pilots now.                                                                                                                          | Now: paid design projects (fits "paid research" and "production improvement" in `PRODUCT_REVIEW.md` Part 5).                           |

---

## Part 1: proof of work

### What already exists (from the code)

You have built much more of this than the site shows. In the backend (`src/modules/rnd/`) and the
R&D pages:

- **Daily logs** with text or a YouTube video link. One AI call (Gemini) turns each log into a
  transcript, a summary, the claims made ("I closed ticket X") and evidence links.
- **Claim checking:** a four-step check that compares claims against real evidence:
    - GitHub commits, signatures and the substance of code changes
    - suspicious timing
    - photo receipts for physical work, with duplicate and stock-photo detection
- **The equity formula:** "Slicing Pie" dynamic equity. Time is valued at a market rate × 2, cash
  × 4, and each person's share is their slices ÷ all slices.
- **Monthly pay statements:** what each person is owed in cash and equity. They are locked,
  countersigned by a second person and confirmed by the member on receipt. Qatoto never holds
  the money.
- **A 24-hour dispute window** before anything counts, which cannot be switched off.
- **An investor confidence score,** computed nightly from logging streaks, verified milestones
  and the dispute rate.

`PROOF_OF_EFFORT_SPEC.md` already has careful legal thinking: AI only _extracts facts_, a fixed
formula does the maths, emotion detection is never used, and pay is never held back because of an
AI verdict.

### What is missing compared with your goal

1. **Company health for investors:**
    - sales, profit margin, loss, cash in the bank, burn rate (money spent per month), runway
      (months left)
    - none of these are in the system today
    - they should come from connections to the tools companies already use (accounting: Tally,
      Zoho Books, QuickBooks, Xero; payments: Razorpay, Stripe; shops: Shopify, Amazon), read-only
    - never from numbers typed in by hand, which nobody can check
2. **Product health:** milestones, test results, defect counts, prototype versions. This links
   to Part 2.
3. **Work that isn't code:** today the strongest evidence is GitHub. Sales, design, supplier calls
   and factory work need their own evidence sources:
    - Figma, Onshape or Fusion file history
    - email or CRM activity counts (not content)
    - signed supplier quotes, photos with time stamps
4. **Video upload:** daily videos are YouTube links only. Many teams won't post internal work to
   YouTube, even as unlisted videos. You would need private storage, and that costs money and adds
   privacy duties.
5. **Strengths per person:** not built. See the warning below before building it.

### The big warning: promote, demote, fire

This is the part of your idea that needs the most care.

**1. It is regulated almost everywhere, and the rules are arriving now.**

| Place           | Rule                                                                                                                                                                                                                                       | Status (checked 2026-11-03)                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| European Union  | AI Act: AI used for promotion, firing, task allocation or monitoring of workers is **"high-risk"**. Strict duties apply: human oversight, records, telling workers. Reading emotions from a worker's face or voice is **banned outright**. | The emotion ban has applied since February 2025. High-risk duties for employment tools were delayed to **2 December 2027** by the "Digital Omnibus" law (final approval June 2026). |
| European Union  | GDPR Article 22: people have the right not to be judged by a purely automated decision with serious effects, and the right to a human review.                                                                                              | In force                                                                                                                                                                            |
| India           | DPDP Act 2023 and Rules 2025: employment data (payroll, performance) is a "legitimate use", but notices, security and rights still apply. Penalties go up to ₹250 crore.                                                                   | Rules notified 13 November 2025. Full compliance due around **13 May 2027**.                                                                                                        |
| USA, Illinois   | Illinois Human Rights Act amended (HB 3773): employers must not use AI in a way that discriminates in hiring, promotion or firing, and must tell workers.                                                                                  | In force since 1 January 2026                                                                                                                                                       |
| USA, California | Civil Rights Council rules on automated decision systems; CPPA rules on automated decision-making technology (ADMT).                                                                                                                       | Civil Rights Council rules in force since October 2025. CPPA rules effective January 2026, phasing in to 2027.                                                                      |
| USA, Colorado   | Colorado AI Act covers "high-risk" AI in employment.                                                                                                                                                                                       | Delayed. Sources disagree between June 2026 and **January 2027**, so check the current date.                                                                                        |

**2. It breaks trust, which is the product.** Your own spec says it: people won't let a tool they
think is out to fire them measure their work. They will game it (log more, talk more, push more)
or leave.

**3. Measuring uploads rewards the visible, not the valuable.** The person who writes the longest
daily update is not always the one doing the most important work. Once a number decides pay,
people chase the number.

**So reframe it:**

- **The platform shows evidence; people decide.** "Here is what each person verifiably did this
  month" is fine. "Fire this person" must never appear.
- **No ranking, no "weakest employee" list, no automatic demotion flag.**
- **Strengths, carefully:** show each person _their own_ record and the kinds of work they did
  most (for example design, supplier work, testing). Let them choose to share it. Use it for
  coaching, not cutting.
- **Keep the existing rules:** no emotion analysis, a human can always dispute, and cash is never
  held back by an AI verdict.

### What investors actually want

- **Not daily.** Investors read a **weekly or monthly summary**. Daily detail should be there to
  click into, not pushed at them.
- **The usual contents:** revenue, cash, runway, customer growth, hiring, product milestones,
  risks, and "what help we need".
- **Your edge:** each line in the summary links to **verified evidence** (logs, commits,
  receipts), not just the founder's word. No investor-update tool does that today.

### Competitors for proof of work

| What they do                              | Examples                                 | What they lack versus Qatoto                                              |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Daily or weekly stand-up bots             | Geekbot, Range, Standuply                | Collect updates; don't verify them or turn them into pay or equity        |
| Performance reviews                       | Lattice, 15Five, Culture Amp             | Opinion-based reviews; no evidence trail, no equity link                  |
| Time and activity monitoring ("bossware") | Hubstaff, ActivTrak, Insightful          | Watch screens and clicks; widely disliked; **don't position Qatoto here** |
| Dynamic equity                            | Slicing Pie (Pie Slicer app)             | Manual entry; nothing checks the hours are real                           |
| Cap tables                                | Carta, Pulley; India: Qapita, EquityList | Record shares once issued; don't measure who earned them                  |
| Investor updates                          | Visible, Standard Metrics, Carta         | Founder-written numbers; no link to verified work                         |

**The gap you fill:** _verified work → fair pay and equity statement → investor view_, as one chain.
Each competitor covers one link. That chain is the selling point.

---

## Part 2: full product R&D (blueprint a manufacturer can build from)

### What a manufacturer actually needs

Engineers call this a **technical data package**. A factory will quote and build only from
something like this:

1. **Requirements:** what the product must do, its size, weight, target cost, quantity, where it
   will be sold.
2. **3D model:** a STEP file for each part and for the assembly.
3. **2D drawings:** each part with dimensions, tolerances (how much size error is allowed),
   material, surface finish and revision number.
4. **Bill of materials (BOM):** every part, quantity, part number, approved suppliers.
5. **Electronics** (if any): circuit diagram (schematic), board files (Gerbers), component
   placement file, firmware.
6. **Assembly instructions:** the order to put it together, with tools and torque values.
7. **Test and inspection plan:** how the factory proves each unit is good.
8. **Packaging and labelling:** box, manual, warning labels, barcodes.
9. **Compliance targets:** which certificates it needs (BIS, CE, FCC and so on). Links to the
   certification guide in `PRODUCT_REVIEW.md`.
10. **Revision history:** which version is approved, and who signed it off.

### What exists in Qatoto today

- **Teardowns** describe an _existing_, bought product: its parts, materials, files and 3D
  exploded view. The rules in `AGENTS.md` keep teardowns for existing products only. Do not
  stretch them to cover new designs. A new design needs its own record type.
- **Quote requests (RFQs), quote comparison and the factory directory** are the right last step:
  they are where a finished package goes.
- **No design workspace, no package checklist and no versioning** for a new product exist yet.

### Can AI build the blueprint? Not on its own, yet.

As of 2026:

| Area                    | Tools                                                   | Honest state                                                                                                    |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Mechanical 3D from text | Zoo (Text-to-CAD, Zookeeper agent), others              | Makes editable 3D parts from a description. Good for early shapes; needs an engineer to make it manufacturable. |
| Scan to CAD             | Backflip                                                | Turns a 3D scan of a real object into an editable model. Useful for improving existing products.                |
| Circuit boards          | Flux (AI design tool), Quilter (automatic board layout) | Speeds up board design a lot. Makers still say a human must review it for manufacturing before fabrication.     |
| Standard design tools   | Onshape, Fusion, SolidWorks; KiCad, Altium              | What real engineers use. Qatoto should connect to these, not compete.                                           |

**Conclusion: do not build a CAD tool.** It is a huge, crowded market with well-funded players.

### What Qatoto should do instead

1. **Sell design as a service.** Your engineers, or vetted partners under contract, produce the
   package for a client using the tools above. This is paid work now, like "paid research" in
   `PRODUCT_REVIEW.md`.
2. **Build a light "product package" workspace** on the platform:
    - the 10-item checklist above, with "done / missing" worked out from uploaded files
    - versioned files with a named person approving each version
    - a one-click handoff to the existing quote-request flow, so factories quote against the
      approved version
3. **Connect it to proof of work.** Every file version, review and approval is evidence of who
   did the design work. That feeds their equity or pay through Part 1, and it settles **who owns
   the design**.

### Risks for product R&D

- **Liability:**
    - a wrong drawing leads to wrong parts, recalls and possibly injury
    - use clear contracts that limit liability, and consider professional insurance
    - have a qualified engineer sign off safety-critical designs
- **Ownership of the design (IP):**
    - everyone who contributes must sign an IP assignment to the company, or the company may not
      own its own product
    - make this a required step before work is counted
- **Confidentiality:** client designs are private by default. Never publish them without
  written permission, which is the opposite of public teardowns.
- **Skill:** this needs real mechanical, electrical and manufacturing engineers. Start with one
  product type you can actually deliver (for example simple electronics or consumer goods), not
  "any product".

### Competitors for product R&D

| What they do                          | Examples                                                              |
| ------------------------------------- | --------------------------------------------------------------------- |
| Product design and engineering firms  | Local design consultancies; in India, many engineering-services firms |
| Online manufacturing with design help | Fictiv, Xometry, Protolabs, Sourcify                                  |
| Design tools                          | Onshape, Fusion, SolidWorks, Zoo, Flux, Quilter                       |
| Parts and BOM management              | Arena (PLM), OpenBOM, Duro                                            |

**Your edge:** design firms hand over files and leave. Qatoto keeps the package, the record of who
built it (and what they earned), the factory quotes and the export path (`PRODUCT_REVIEW.md`
Part 5) in one place.

---

## Part 3: recommended plan

1. **Now: run proof of work with 3 to 5 real teams for free.** Ideally they are clients of your
   paid design or research service. Fix what they complain about. Don't add features they didn't
   ask for.
2. **Now: sell product design as a paid service** in one product category, and deliver the
   package through the platform's quote flow.
3. **Next:**
    - add read-only finance connections (accounting, payments, shop) so investors see real
      revenue, margin, burn and runway
    - add a weekly investor summary where every line links to evidence
4. **Next:** build the light product-package workspace (checklist, versions, sign-off, handoff to
   quotes).
5. **Before any EU or US customer uses it for employment decisions** (and by December 2027 at the
   latest for the EU): legal review, a data protection impact assessment, worker notices and
   documented human oversight.
6. **Never:** auto-rank employees, recommend firing, analyse emotions in videos, or hold back pay
   on an AI verdict.

**One-line pitch for the combined focus:**

> **"Build your product with your team. Qatoto keeps a verified record of who did what, turns it
> into fair pay and equity, and gives your investors and your factory the real picture."**

## Sources

- EU AI Act employment deadline delayed to December 2027: [Ogletree](https://ogletree.com/insights-resources/blog-posts/eu-nears-approval-of-agreement-to-delay-rules-for-ai-use-in-employment-decisions/),
  [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2026/The-Digital-AI-Omnibus-Proposed-deferral-of-high-risk-AI-obligations-under-the-AI-Act),
  [Cuatrecasas](https://www.cuatrecasas.com/en/global/labor-and-employment/art/digital-omnibus-on-ai-how-does-it-impact-employment-relations),
  [Ius Laboris](https://iuslaboris.com/insights/eu-ai-act-simplification-delays-employers/)
- India DPDP Rules timeline and employee data: [Fisher Phillips](https://www.fisherphillips.com/en/news-insights/indias-new-data-privacy-rules-are-here.html),
  [Hogan Lovells](https://ca.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-),
  [Mondaq](https://www.mondaq.com/india/data-protection/1709814/indias-new-data-privacy-regime-how-smart-companies-will-use-the-next-eighteen-months)
- US state AI employment laws: [Covington Inside Privacy](https://www.insideprivacy.com/state-privacy/admt-law-round-up-what-employers-need-to-know-about-recent-admt-laws/),
  [Mondaq](https://www.mondaq.com/unitedstates/new-technology/1729732/several-state-ai-laws-set-to-go-into-effect-in-2026-despite-federal-governments-push-to-eliminate-state-level-ai-regulations),
  [WashU Law](https://law.washu.edu/ai-policy-and-regulation-resources/labor-employment/)
- Investor update tools: [Visible](https://visible.vc/blog/vc-portfolio-monitoring-software/),
  [Standard Metrics](https://standardmetrics.io/why-heavybit-turned-to-standard-metrics/)
- AI design tools: [Zoo on 3DPrint.com](https://3dprint.com/306632/zoo-aims-to-disrupt-manufacturing-with-text-to-cad-and-other-hardware-design-tools/),
  [Zoo blog](https://zoo.dev/blog), [Backflip](https://www.backflip.ai/blog/announcing-backflip),
  [Flux funding, SiliconANGLE](https://siliconangle.com/2026/02/27/flux-nabs-37m-automate-printed-circuit-board-development-ai/),
  [JLCPCB on AI PCB tools](https://jlcpcb.com/blog/ai-tools-for-pcb-design)
- Competitor names without links come from general knowledge up to mid-2026 and were not freshly
  checked.
