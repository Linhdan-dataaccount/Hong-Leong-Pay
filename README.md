# Hong Leong Pay — Product Lab

An interactive student MVP for installment checkout and explainable cashflow underwriting. This is a proposed product concept, not an official Hong Leong Bank service. All 200 account profiles and their transactions are synthetic. No real identity checks, CIC access, credit decisions, signatures, payouts or payments take place.

## Demo and design

- Customer app: https://hong-leong-pay-lab.linhdancatinat.chatgpt.site
- Product lab: https://hong-leong-pay-lab.linhdancatinat.chatgpt.site/admin
- Editable Figma: https://www.figma.com/design/cYWgZ2WjlDqmSOUAWHjCTF

## Run locally

Prerequisites: Node.js 22.13 or later and pnpm 11.25.0. Open this folder in a terminal:

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Open the localhost URL printed by the development server. No API key is needed. Runtime ML inference runs in the browser from a saved model. Applications are stored in your browser's localStorage; they are not shared across devices. The dataset is included in the code and is not confidential account data.

## Customer experience

The home page is the customer app: payment method → plan → consent/account connection → simulated identity verification → assessment → offer or next step → terms and schedule → demo purchase confirmation → installments. Animations respect reduced-motion preferences. The Product Lab has moved to `/admin`; it remains a research/demo interface, not a protected production admin system.

The customer app and product lab share browser-local demo application records. Presenter controls under Demo settings switch all five customer segments, an identity-mismatch scenario and three illustrative purchases. These controls are separate from the proposed customer checkout. The first-time sample has short account history and requires more evidence; other first-time dataset clients have longer bank histories.

Figma: https://www.figma.com/design/cYWgZ2WjlDqmSOUAWHjCTF

## Product lab walkthrough

1. Checkout lab: select any of the five segments or an individual sample account, choose price, down payment and term. Give demo consent and run eligibility.
2. Explore Green (offer), Yellow (additional evidence or smaller loan) and Red (decline). Open identity simulation to test the fraud gate. Policies shown in the app are illustrative.
3. Cashflow engine: inspect inferred income vs total inflows. Filter uncertain transactions, change a source category only when verified, and rerun the assessment. Manual reviews change the demo estimate; they do not retrain the model.
4. Save an application. Review & repayment lets you inspect pending evidence, decline it, accept a Green offer's terms, simulate payout and record installments.
5. Portfolio aggregates actual saved demo applications. Business targets are hypotheses, not achieved outcomes. Model & dataset shows the evaluation and CSV downloads.

## Five layers

Checkout / targeting → simulated identity & fraud gate → segmented cashflow assessment → illustrative policy decision → repayment & feedback. No PD model or fraud GNN is claimed. First-time credit history does not imply short bank history: account history is distributed independently of segment.

## Reproduce training and tests

```bash
node scripts/train-demo.mjs
node --test tests/engine.test.mjs
npx tsc --noEmit
pnpm build
```

The seeded generator produces 200 profiles (71 Salary_CIC, 41 Salary_NoCIC, 30 Gig, 29 Online_Merchant, 29 First_Time). Account history: 100 ×24 months, 50 ×12 months, 20 ×6 months, 30 ×2 months. Each segment has a CSV with the same schema and joins to `dataset/Clients.csv` by client_id. Generation and training replace the synthetic demo assets; they never ingest real bank data.

`lib/engine.mjs` contains the shared predictor and decision logic. `scripts/train-demo.mjs` trains multinomial Naive Bayes with additive smoothing. Features: normalized description tokens, direction, amount range, counterparty repetition frequency, paired direction and amount stability. IDs, client segment and truth labels are not prediction inputs. Counterparty features summarize account history available at the assessment date. The model is a transaction-source classifier, not a model of repayment/default.

Customer-level split: index modulo 5 assigns 160 accounts to training and 40 to test. Model weights are trained only on training accounts. `public/data/evaluation.json` records all-class accuracy, keyword-rule baseline, threshold coverage, above-threshold accuracy and confusion matrix. Synthetic generation makes this an educational experiment; do not interpret its accuracy as real-world underwriting performance. Scores are uncalibrated and require real-data validation.

## Illustrative policy and calculations

- Source labels accepted into income at model score ≥75% (or manual evidence review). Transfers, refunds and loan proceeds are excluded.
- Net supported income = average inferred earnings − average business/work costs. Average across all available account months; living costs use the higher of inferred expenses and a ₫4m floor.
- Gig and online-merchant earnings are stressed by 20%. Existing debt is declared synthetic client metadata; CIC is not queried.
- DSR = (existing monthly debt + proposed installment) / assessed net income. Demo threshold 40%, residual buffer ₫1m after essential living costs.
- Less than 3 months of history or more than 18% of incoming amount below the classification threshold requires evidence review. These are illustrative choices, not official bank policy.
- Purchase ₫1.6m–₫90.1m; term 3/6/9/12/18/24 months. Payment uses equal monthly installments at illustrative 18% annual nominal rate, on reducing balance; no fees.
- Yellow affordability scenarios can suggest a higher down payment. When required down payment reaches 80% of price the scenario declines; this is a demonstration rule, not a validated risk policy.

## Architecture and deployment

React + TypeScript + Next.js App Router, configured for Vercel. No backend credentials or live banking integrations. Local runtime configuration and credentials are ignored by Git. Legacy Cloudflare tooling remains in the repository for reference; the default dev/build/start commands now use Next.js.

### Deploy on Vercel

Import `Linhdan-dataaccount/Hong-Leong-Pay`, select the Next.js framework and deploy the `main` branch. `vercel.json` sets `pnpm install --frozen-lockfile` and `pnpm build`. No environment variables or banking API keys are required for this demo.

The existing customer UI, product lab, synthetic dataset and trained model are preserved. Both `/` and `/admin` are prerendered, then load synthetic account data in the browser.

A production implementation would require bank-approved policies, calibrated real-data validation, secure identity/account consent, audit logs, a shared database, reviewer authorization, fairness checks and repayment outcomes before training a PD model.
