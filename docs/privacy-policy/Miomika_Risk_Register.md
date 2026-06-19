# Miomika — Legal Risk Register & Assumptions Log (Beta)

**Prepared: 15 June 2026 · Internal document — not for publishing**

This is the honest companion to the deployable Terms of Service and Privacy Policy. It records (a) every conservative assumption built into those documents, and (b) the unresolved legal issues, ranked. It is founder-prepared and is **not legal advice**. It exists so that you can launch beta with eyes open and so a Thai lawyer can later review the smallest, cheapest possible scope.

---

## Part A — Assumptions Register

Every assumption below was chosen to *reduce* risk. If any assumption is factually wrong for your situation, fix it before launch.

| ID | Assumption made | Where it applies | Why this is the conservative choice |
|---|---|---|---|
| A1 | Beta is restricted to users **18+** | ToS §2, Privacy §1 | Removes the entire minor-consent / children's-data burden under PDPA, and the minor-safety exposure that companion apps carry. Biggest single risk reducer. |
| A2 | **No AI training** on user conversations or personal data | ToS §9, Privacy §5 | Avoids needing model-training consent, opt-outs, and disclosures. Simplest defensible stance. |
| A3 | **Explicit consent** collected at onboarding to process conversation content as sensitive data | Privacy §3, §4 | PDPA requires explicit consent for sensitive personal data; treating conversations as sensitive is the cautious reading. |
| A4 | Operator is **Mikaro Studio, Bangkok**; contact mailboxes **privacy@miomika.com** and **support@miomika.com** are live and monitored | Both docs, contact sections | Plain-language contact satisfies PDPA's "how to reach us" requirement without naming an individual. **Confirm the entity name matches your registration and the mailboxes exist.** |
| A5 | **30-day deletion** of conversation/learning data after account deletion or consent withdrawal | Privacy §8 | A short, finite, generous window is easier to defend than an open-ended one. |
| A6 | Subscriptions **auto-renew**; cancel anytime effective end of period; **14-day refund** on request during beta | ToS §5 | Clear disclosure + generous refunds reduces consumer-protection exposure during beta. |
| A7 | Liability cap = greater of fees paid in last 12 months or ฿1,000; indirect damages excluded | ToS §12 | Standard protective cap. Enforceability under Thai law is uncertain (see R1). |
| A8 | **Governing law = Thailand**, Thai courts | ToS §14 | Matches where you operate and your users; avoids foreign-law complications. |
| A9 | Processor categories disclosed (Stripe, Omise, cloud hosting, AI voice/language); some are outside Thailand | Privacy §6, §7 | Honest category-level disclosure meets the transparency duty without over-committing to specifics. **Keep an internal list of actual vendors + countries.** |
| A10 | Service explicitly labelled **beta**, "as is" | ToS §1, §11 | Sets expectations and supports the disclaimer posture. |
| A11 | Real Thailand crisis resources cited (1669 / 1323 / 1667 / Samaritans) | ToS §7 | Verified numbers; safe to publish. |
| A12 | We do **not** sell personal data or use it for third-party ads | Privacy §5 | Removes a whole category of consent/disclosure obligations. |

---

## Part B — Risk Register (ranked highest to lowest residual risk)

Residual risk = what remains *after* the conservative assumptions above are applied.

| Rank | ID | Issue | Mitigation already applied | Residual risk | Why it remains | Recommended action |
|---|---|---|---|---|---|---|
| 1 | R1 | Enforceability of the liability cap, disclaimers, and "as is" terms under Thai law | Conservative cap; carve-out for non-excludable rights (ToS §11–12, §14) | **High** | Thai consumer law limits how far liability can be excluded; a foreign-style cap may be read down. | Lawyer review (Delta D1). Do not rely on the cap as absolute. |
| 2 | R2 | Self-declared 18+ age gate is weak; companion apps attract minors | 18+ requirement + delete-on-discovery (ToS §2, Privacy §1) | **Medium-High** | A checkbox does not stop a determined minor; minor-safety is a reputational and legal hotspot. | Add a real age-affirmation step at signup; monitor; revisit if you ever open to under-18 (Delta D4). |
| 3 | R3 | PDPA sensitive-data handling for emotional conversation content | Explicit consent + no training + minimisation + 30-day deletion (Privacy §3, §5, §8) | **Medium** | "Sensitive data" classification and the exact consent wording need legal confirmation. | Lawyer to confirm consent language (Delta D2). |
| 4 | R4 | Cross-border transfer compliance | Disclosure + consent + contractual safeguards (Privacy §7) | **Medium** | PDPA transfer rules require a specific lawful basis/mechanism per destination. | Lawyer to confirm transfer basis; keep vendor/country list (Delta D3). |
| 5 | R5 | Breach-notification capability | Policy commitment to notify PDPC/users (Privacy §11) | **Medium** | A written promise without an operational process is a gap. | Stand up a simple breach-response checklist before launch. |
| 6 | R6 | Subscription auto-renewal / refund rules under Thai consumer law | Clear disclosure + 14-day refund + easy cancel (ToS §5) | **Low-Medium** | Specific disclosure/renewal formalities may apply. | Lawyer spot-check (Delta D5). |
| 7 | R7 | DPO appointment / PDPA registration obligations for the entity | Role-based privacy contact provided (A4) | **Low-Medium** | Whether Mikaro must formally appoint a DPO depends on scale/activity. | Lawyer to confirm (Delta D6). |
| 8 | R8 | Duty of care to vulnerable/at-risk users in a companion product | Wellbeing clause + crisis resources + not-a-substitute framing (ToS §7) | **Medium** | Novel, evolving area; emotional-reliance harms are an emerging risk theme for companion apps. | Keep crisis routing in-product; monitor regulator guidance. |
| 9 | R9 | Accuracy of operator entity details and live contact mailboxes | Assumed (A4) | **Low** | Wrong entity name or dead mailbox undermines the whole notice. | Founder confirms today. |
| 10 | R10 | IP / user-content licence scope | Ownership + limited licence clauses (ToS §8–9) | **Low** | Standard; low exposure given no training and no resale of content. | Lawyer review only if time permits. |

---

## Part C — Launch readiness checklist (founder, before flipping beta on)

- [ ] Confirm entity name matches registration; confirm privacy@ and support@ mailboxes are live (R9/A4).
- [ ] Add an explicit "I am 18+" and "I consent to processing my conversations" step at signup (A1/A3, R2/R3).
- [ ] Keep an internal list of actual processors and their countries (A9/R4).
- [ ] Write a one-page internal breach-response checklist (R5).
- [ ] Keep the crisis resources visible in-product, not only in the ToS (R8).
- [ ] Deploying the text into ToS/Privacy pages and the consent step is **repo work → route to Fable.**
