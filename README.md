# SaaSNotesApp

<div align="center">

![SaaSNotesApp Banner](https://img.shields.io/badge/SaaSNotesApp-Multi--Tenant%20AI%20Notes-6366f1?style=for-the-badge&logo=notion&logoColor=white)

**A scalable, multi-tenant SaaS notes platform with AI-powered summarization and semantic search.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Azure](https://img.shields.io/badge/Azure-App%20Service-0078D4?style=flat-square&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[Features](#-features) · [Architecture](#-architecture) · [Security](#-security) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Deployment](#-deployment) · [Load Testing](#-load-testing)

</div>

---

## Overview

SaaSNotesApp is a production-grade, cloud-native notes platform built for teams. It uses a **shared-schema multi-tenant architecture** with multiple independent layers of data isolation, and an **asynchronous AI pipeline** that decouples note creation from LLM latency — notes are saved instantly while summarization and embedding happen in the background.

### Why This Architecture?

| Challenge | Solution |
|:----------|:---------|
| Serving multiple organizations on shared infrastructure | Shared-schema MongoDB with `tenantId`-scoped queries, compound indexes, and explicit `$vectorSearch` pre-filters |
| LLM inference blocking HTTP request cycles (2–8s latency) | Asynchronous BullMQ job queue returning `202 Accepted` immediately |
| High read latency under concurrent load | Redis Cache-Aside layer; p95 latency dropped from **340ms → 24ms** |
| Contextual "find similar notes" discovery | Sentence embeddings + cosine similarity via MongoDB `$vectorSearch` with mandatory tenant pre-filter |
| Mixed-criticality data sharing one Redis instance | Two separate Azure Cache for Redis instances: one `allkeys-lru` for cache/rate-limit, one `noeviction`+AOF for blocklist, queue, and quota counters |
| Horizontal scaling with shared state | Centralized Redis for caching and rate limiting across all instances |

---

## ✨ Features

### Core
- 📝 **Multi-tenant Notes** — Create, edit, tag, and organize notes scoped to your organization
- 🔐 **JWT Authentication** — 15-min access tokens, 7-day HttpOnly refresh cookies with reuse detection
- 👥 **Role-Based Access Control** — `Admin` (manage members, delete any note) and `Member` (own notes only; ownership enforced on write)
- 🔎 **Full-Text Search** — MongoDB text indexes for keyword search; strictly tenant-scoped
- 📧 **Email Verification** — Required on registration before tenant access is granted
- 🔑 **Password Reset** — Time-limited, single-use signed reset tokens delivered via email

### AI-Powered
- 🤖 **Async AI Summarization** — Notes saved instantly; summaries arrive via BullMQ background worker
- 🧠 **Semantic Search** — Vector embeddings + cosine similarity with `$vectorSearch` pre-filtered by `tenantId` before HNSW graph traversal
- ♻️ **Resilient AI Pipeline** — Exponential backoff retries (3 attempts), dead-letter queue, idempotent job IDs
- 💰 **Cost Controls** — Per-request content-length cap (16 KB) and per-tenant hourly job quota to bound LLM spend
- ⚖️ **Fair Queue Scheduling** — Per-tenant BullMQ queues with weighted round-robin to prevent a high-volume tenant from starving others

### Performance & Security
- ⚡ **Redis Caching** — Cache-Aside with tenant-namespaced, versioned list invalidation (`allkeys-lru` on Cache instance)
- 🛡️ **Rate Limiting** — Dual-tier Redis sliding window (IP-level for auth routes, user-level for API/AI routes)
- 🔑 **Token Blocklist** — Redis-backed JWT JTI revocation on Durable instance (`noeviction` + AOF); refresh endpoint validates active membership before issuing
- 🧱 **Input Validation** — Zod schema validation including `max()` content-length checks on all request bodies
- 🔒 **Password Security** — bcrypt with cost factor 10
- 🍪 **CSRF Protection** — Refresh token cookie set with `SameSite=Strict`; state-mutating routes additionally require `X-Requested-With` header

### Infrastructure
- 📊 **Observability** — Structured JSON logging (Winston) shipped to Azure Monitor; BullMQ Bull Board dashboard; split health probe (`/api/v1/health` public liveness, `/api/v1/health/detail` probe-secret gated)
- ☁️ **Azure Deployment** — App Service (Linux) + two Azure Cache for Redis instances (Cache + Durable) + Azure Key Vault for secrets
- 🐳 **Docker Ready** — `docker-compose.yml` for local MongoDB + Redis dev setup
- 📈 **Load Tested** — k6 test suite; benchmarks included

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Frontend                               │
│           (Tailwind CSS, React Query, Zustand)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Azure App Service (Node.js)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  JWT + RBAC  │→ │  Rate Limit  │→ │  Zod Validation (incl.     │ │
│  │  Middleware  │  │  (Redis      │  │  content-length max check) │ │
│  │              │  │   Cache)     │  │                            │ │
│  └──────────────┘  └──────────────┘  └───────────┬────────────────┘ │
│                                                   │                 │
│  ┌────────────────────────────────────────────────▼───────────────┐ │
│  │           Notes / Auth / Search Controllers                     │ │
│  │  (all note lookups filter on tenantId AND userId/ownership)     │ │
│  └──────────┬───────────────────────────┬──────────────────────┘  │ │
│             │                           │                           │
│       Cache-Aside                 Enqueue AI Job                   │
│       ┌─────┴──────┐              ┌─────▼──────┐                   │
│       ▼            ▼              ▼             ▼                   │
│  ┌─────────┐ ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Redis   │ │ MongoDB  │  │ Redis    │  │ BullMQ per-tenant    │ │
│  │ Cache   │ │ Atlas    │  │ Durable  │  │ queues               │ │
│  │(allkeys │ │ Shared   │  │(Queue,   │  │ Round-robin sched.   │ │
│  │  -lru)  │ │ Schema)  │  │noevict.) │  └──────────┬───────────┘ │
│  └─────────┘ └──────────┘  └──────────┘             │              │
└────────────────────────────────────────────────────  │  ────────────┘
                                                       │ Dequeue
                                                       ▼
                                       ┌───────────────────────────────┐
                                       │  Background AI Worker          │
                                       │  (Azure WebJob / Container)    │
                                       │                                │
                                       │  1. Check per-tenant quota     │
                                       │  2. Enforce content-length cap │
                                       │  3. Call LLM for summary       │
                                       │  4. Generate embedding vector  │
                                       │  5. Update MongoDB note doc    │
                                       │  6. Update job status key      │
                                       └──────────────┬────────────────┘
                                                      │
                                       ┌──────────────▼────────────────┐
                                       │  OpenAI / Gemini API           │
                                       │  (text-embedding-3-small)      │
                                       └───────────────────────────────┘
```

---

## 🔒 Security

### Tenant Data Isolation

Every note document carries an indexed `tenantId` field. **Four independent layers** enforce that no query can return data outside the requesting tenant.

> [!CAUTION]
> **The critical gap:** Mongoose's `.pre('find')` / `.pre('findOne')` query middleware hooks into the standard query builder chain. `Model.aggregate()` bypasses that chain entirely and talks to the MongoDB driver almost directly — so the Mongoose pre-hook **never fires** for aggregation pipelines. Any `Note.aggregate([{ $vectorSearch: { ... } }])` call that omits a `tenantId` filter will run an ANN search over the entire indexed collection and return whichever notes are nearest in vector space, regardless of tenant. The "no query reaches the database without a tenant filter" guarantee is **silently false** for this code path unless the filter is injected explicitly inside the aggregation stage itself.

#### The Atlas Search Index Requirement

`$vectorSearch`'s `filter` option only works when `tenantId` is declared as a `"filter"` type field in the Atlas Search index definition. The index must be configured before filtering is possible:

```json
// Atlas Search index definition (configure in MongoDB Atlas UI or CLI)
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "tenantId"
    }
  ]
}
```

#### The Correct Aggregation Pattern

```js
// server/src/repositories/note.repository.js
// ✅ SAFE — tenantId pre-filter constrains HNSW graph traversal before ANN search runs
async semanticSearch(tenantId, queryVector, { limit = 10, minScore = 0.72 } = {}) {
  return Note.aggregate([
    {
      $vectorSearch: {
        index: 'note_embedding_index',
        path: 'embedding',
        queryVector,
        numCandidates: 150,
        limit,
        filter: { tenantId: { $eq: new mongoose.Types.ObjectId(tenantId) } }
        // Pre-filter: HNSW graph traversal is constrained to this tenant's nodes.
        // Post-filtering would silently starve small tenants if large tenants
        // dominate the top-K results before the $match stage runs.
      }
    },
    {
      // Belt-and-suspenders: redundant post-filter catches any edge-case ANN
      // result that slipped past the pre-filter (should never fire in practice,
      // but makes the security invariant testable and auditable).
      $match: { tenantId: new mongoose.Types.ObjectId(tenantId) }
    },
    {
      $project: {
        title: 1,
        snippet: 1,
        aiSummary: 1,
        createdAt: 1,
        score: { $meta: 'vectorSearchScore' },
        embedding: 0   // never return raw vectors to the client
      }
    },
    { $match: { score: { $gte: minScore } } }
  ]);
}
```

#### Repository Enforcement — No Raw Aggregate Calls Outside the Repo

The `semanticSearch` method above lives exclusively in `NoteRepository`. Controllers are not permitted to call `Note.aggregate()` directly — the same way they cannot call `Note.find()` directly. This is enforced by:

1. **ESLint rule** (`no-restricted-syntax` or a custom plugin) that flags any `Note.aggregate(` call outside `src/repositories/`.
2. **Code review checklist item:** any new aggregation pipeline must be reviewed for an explicit `tenantId` filter at the `$vectorSearch` or `$search` stage.

#### Cross-Tenant Isolation Test (Required)

The bug that the pre-filter prevents passes every standard happy-path test. The test that would have caught it:

```js
// tests/integration/semantic-search.isolation.test.js
it('semantic search never returns results from another tenant', async () => {
  // Seed two tenants with near-identical note content
  // (small vector distance — worst case for leakage)
  const { token: tokenA, tenantId: tenantA } = await createTenantWithNote(
    'Q4 budget planning for engineering team'
  );
  const { tenantId: tenantB } = await createTenantWithNote(
    'Q4 budget planning for engineering team'   // identical text, different tenant
  );

  const res = await api
    .post('/api/v1/search/semantic')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ query: 'quarterly budget engineering', limit: 20 });

  expect(res.status).toBe(200);

  const returnedTenantIds = res.body.results.map(r => r.tenantId);
  expect(returnedTenantIds.every(id => id === tenantA)).toBe(true);

  // Explicitly assert tenant B's note ID is absent
  const tenantBNoteIds = await getNoteIdsForTenant(tenantB);
  const leaked = res.body.results.filter(r => tenantBNoteIds.includes(r.id));
  expect(leaked).toHaveLength(0);
});
```

#### All Four Isolation Layers

| Layer | Scope | Mechanism |
|:------|:------|:----------|
| **JWT Middleware** | All routes | Injects `req.tenantId` from verified token claims |
| **Mongoose Pre-Hook** | `find` / `findOne` / `findById` only | Aborts if `tenantId` condition is absent — does **not** cover `.aggregate()` |
| **Repository Pattern** | All DB access | `NoteRepository(tenantId)` is the only permitted DB access path; raw `Note.*` calls are lint-banned outside the repo |
| **Aggregation Pre-Filter** | `$vectorSearch` / `$search` stages | `filter: { tenantId: { $eq: tenantId } }` injected at the stage level, plus a belt-and-suspenders `$match` post-filter |

### IDOR & Ownership Enforcement

Tenant membership alone is insufficient for write authorization. Note operations enforce ownership at the query level, not just at the middleware level:

```js
// GET /notes/:id — tenantId + read access (member can read own; admin reads any)
const note = await NoteRepository.findOne({
  _id: noteId,
  tenantId,
  ...(req.user.role === 'Member' ? { ownerId: req.user.id } : {}),
});

// PUT /notes/:id — members can only edit their own notes
const note = await NoteRepository.findOneAndUpdate(
  { _id: noteId, tenantId, ownerId: req.user.id }, // Members always own-scoped
  update,
  { new: true }
);

// DELETE /notes/:id — Admin: any note in tenant; Member: own notes only
const filter = req.user.role === 'Admin'
  ? { _id: noteId, tenantId }
  : { _id: noteId, tenantId, ownerId: req.user.id };
```

MongoDB returns `null` on a mismatch — the controller always responds `404` (not `403`) to avoid confirming that an ID exists in the tenant.

### Redis: Split by Data Criticality

> [!WARNING]
> Sharing one Redis instance and one eviction policy across cache, rate limiter, JWT blocklist, job queue, and quota counters means you are implicitly choosing "it's fine to evict queued jobs, un-revoke tokens, and reset LLM spend quotas" without ever deciding that on purpose. Cache data is designed to be lost. Blocklist, queue, and quota data must never be lost.

#### Five Logical Databases

```js
// server/src/config/redis.js
const Redis = require('ioredis');

const cacheClient = new Redis(process.env.REDIS_CACHE_URL, { db: 0 });
// allkeys-lru instance-wide on Cache instance; worst case of eviction is a cache miss

const rateLimitClient = new Redis(process.env.REDIS_CACHE_URL, { db: 1 });
// Same allkeys-lru instance policy applies; rate-limit counter eviction is accepted
// low-severity risk (resets a window early, not a security hole)

const blocklistClient = new Redis(process.env.REDIS_DURABLE_URL, { db: 0 });
// noeviction: losing a JTI entry = revoked token becomes valid again

const queueClient = new Redis(process.env.REDIS_DURABLE_URL, {
  db: 1,
  maxRetriesPerRequest: null  // required by BullMQ
});
// noeviction: losing a queued job = silently dropped AI work with no user-facing error

const quotaClient = new Redis(process.env.REDIS_DURABLE_URL, { db: 2 });
// noeviction: quota counters must not be silently evicted — early reset = tenant
// exceeds their hourly LLM spend cap without being blocked

module.exports = { cacheClient, rateLimitClient, blocklistClient, queueClient, quotaClient };
```

| Client | Instance | Data | Effective Eviction | Persistence | Severity of Loss |
|:-------|:---------|:-----|:-------------------|:------------|:-----------------|
| `cacheClient` | Cache (Basic C0) | Note/list cache | `allkeys-lru` ¹ | None (In-memory) | Cache miss — acceptable |
| `rateLimitClient` | Cache (Basic C0) | Rate-limit counters | `allkeys-lru` ¹ | None (In-memory) | Counter reset — low severity (accepted) |
| `blocklistClient` | Durable (Premium P1) | JWT JTI blocklist, membership flags | `noeviction` | AOF `everysec` | Revoked token becomes valid — **critical** |
| `queueClient` | Durable (Premium P1) | BullMQ job queues | `noeviction` | AOF `everysec` | Dropped AI jobs, silent data loss — **critical** |
| `quotaClient` | Durable (Premium P1) | Per-tenant hourly AI job counters | `noeviction` | AOF `everysec` | Tenant exceeds LLM spend cap silently — **critical** |

¹ `maxmemory-policy` on Azure Cache for Redis is instance-wide. The Cache instance runs `allkeys-lru` across both DBs. Rate-limit counter loss is an accepted low-severity risk; quota counter loss is not, which is why `quotaClient` lives on the Durable instance.

#### Azure-Specific Caveat: `maxmemory-policy` Is Instance-Wide

> [!IMPORTANT]
> On Azure Cache for Redis, `maxmemory-policy` is configured at the **instance level**, not per logical database. Using DB indexes under a single instance does **not** give independent eviction policies per DB — if you configure `allkeys-lru` for the cache, that policy also applies to the blocklist and queue DBs on the same instance.
>
> **The correct production setup is two separate Azure Cache for Redis instances** (one Basic tier for caching, one Premium tier for durable AOF persistence). See [Deployment](#-deployment) for the exact provisioning commands.

#### Explicit Fail Behavior (Not Driver Defaults)

When a Redis connection is unavailable, behavior is configured explicitly in middleware — not left to whatever `ioredis` does by default:

| Connection | Unavailable Behavior | Decision Rationale |
|:-----------|:---------------------|:-------------------|
| `cacheClient` | **Fail-open** — fall through to MongoDB | Performance optimization; a brief outage should not take down the API |
| `rateLimitClient` | **Fail-open** — allow the request | Better to briefly allow extra traffic than 503 the API over a rate-limit blip |
| `blocklistClient` | **Fail-closed** — return `503` | Better to briefly 503 than let a fired employee keep API access during an outage |
| `queueClient` | **Fail-closed** — return `503` on note creation | Surfaces the problem immediately; prevents silent job loss |
| `quotaClient` | **Fail-closed** — return `503` on note creation | Prevents tenants from silently exceeding LLM spend cap when quota counter is unreachable |

Codified in `server/src/middleware/redis-availability.js` and covered by integration tests that simulate connection failures.

### JWT & Refresh Token Security

- **Access tokens:** 15-minute expiry; JTI stored in `blocklistClient` on logout or member removal (TTL = remaining token lifetime).
- **Refresh tokens:** 7-day expiry; single-use with rotation. Each token stores a `familyId`. If a **rotated-out** (already-used) refresh token is replayed, the entire family is immediately invalidated — all active sessions for that user are terminated.
- **Membership check on refresh:** `POST /auth/refresh` verifies the user still exists and is `active` in the tenant before issuing a new access token. A removed member cannot mint new access tokens off a lingering refresh token.
- **Cookie attributes:** `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`. `SameSite=Strict` prevents cross-site requests from triggering token rotation. State-mutating routes additionally require the `X-Requested-With: XMLHttpRequest` header as a secondary CSRF gate.

### Secrets Management

> [!CAUTION]
> `az webapp config appsettings set` stores secrets as plaintext in App Service configuration. For production, use Azure Key Vault references instead:

```bash
# Store secrets in Key Vault
az keyvault secret set --vault-name saas-notes-kv \
  --name JWT-ACCESS-SECRET --value "<secret>"

# Reference from App Service — value is never stored in App Config
az webapp config appsettings set \
  --name saas-notes-api \
  --resource-group saas-notes-rg \
  --settings JWT_ACCESS_SECRET="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=JWT-ACCESS-SECRET)"
```

App Service resolves the reference at runtime using its Managed Identity — no secret ever touches app configuration or environment variable dumps.

---

## 🗂️ Project Structure

```
saas-notes-app/
├── client/                        # React 18 frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/                 # useNotes, useSearch, useAiStatus
│   │   ├── store/                 # Zustand global state
│   │   └── lib/                   # API client, utils, types
│   └── tailwind.config.js
│
├── server/                        # Node.js / Express backend
│   ├── src/
│   │   ├── controllers/           # auth, notes, search, members, health
│   │   ├── middleware/            # JWT, RBAC, rate-limit, validation, csrf
│   │   ├── models/                # Note, User, Tenant, PasswordResetToken
│   │   ├── repositories/          # TenantScopedNoteRepository (all DB access)
│   │   ├── services/
│   │   │   ├── ai.service.js      # LLM client; enforces content-length cap
│   │   │   ├── cache.service.js   # cacheClient cache-aside helpers (Redis Cache instance)
│   │   │   ├── queue.service.js   # BullMQ producer; per-tenant queue routing
│   │   │   ├── quota.service.js   # Per-tenant hourly AI job counter (Redis Durable instance — must survive eviction)
│   │   │   └── email.service.js   # Verification & password-reset emails
│   │   ├── workers/
│   │   │   └── ai.worker.js       # BullMQ consumer; round-robin across tenant queues
│   │   ├── config/
│   │   │   └── redis.js           # Five DB connections across two instances (cacheClient, rateLimitClient, blocklistClient, queueClient, quotaClient)
│   │   ├── routes/
│   │   └── app.js
│   └── index.js
│
├── worker/                        # Standalone worker entry point (Azure WebJob)
│   └── index.js                   # Boots BullMQ consumers only — no HTTP server
│
├── load-tests/
│   ├── notes-read.js
│   ├── notes-write.js
│   └── semantic-search.js
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v20+
- [Docker](https://docker.com) (for local MongoDB + Redis)
- [OpenAI API Key](https://platform.openai.com) or [Google AI Studio Key](https://aistudio.google.com)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/saas-notes-app.git
cd saas-notes-app
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

See [Environment Variables](#-environment-variables) for the full reference.

### 3. Start Local Infrastructure

```bash
# Starts MongoDB (27017) and Redis (6379) via Docker
docker-compose up -d
```

### 4. Install Dependencies & Run

```bash
# Backend API
cd server && npm install && npm run dev

# Background worker (separate terminal — mirrors production split)
cd worker && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```

App: **`http://localhost:5173`** · API: **`http://localhost:3000`**

> **Note:** Running API and worker as separate processes locally intentionally mirrors production deployment — it prevents the hidden "works in dev, breaks at scale" issue of multiple App Service instances each spawning their own worker consumer.

---

## 🔧 Environment Variables

### Required

| Variable | Description | Example |
|:---------|:------------|:--------|
| `PORT` | Express server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/saas_notes` |
| `REDIS_CACHE_URL` | Redis Cache instance URL (cache + rate-limit) | `redis://localhost:6379` |
| `REDIS_DURABLE_URL` | Redis Durable instance URL (blocklist + queue + quota) | `redis://localhost:6380` |
| `JWT_ACCESS_SECRET` | Access token signing secret (min 64 chars) | *(random hex)* |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 64 chars) | *(random hex)* |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `EMAIL_FROM` | Sender address for verification/reset emails | `noreply@yourdomain.com` |
| `SMTP_URL` | SMTP connection string (embeds credentials) | `smtp://user:pass@host:587` |
| `PROBE_SECRET` | Shared secret for `/api/v1/health/detail` probe auth | *(random hex)* |

### Optional / Overrides

| Variable | Description | Default |
|:---------|:------------|:--------|
| `AI_PROVIDER` | `openai` or `google` | `openai` |
| `GOOGLE_AI_API_KEY` | Google AI Studio key | — |
| `EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` |
| `SUMMARY_MODEL` | Chat completion model | `gpt-4o-mini` |
| `AI_CONTENT_MAX_BYTES` | Max note content size sent to LLM (bytes) | `16384` |
| `AI_TENANT_HOURLY_QUOTA` | Max AI jobs per tenant per hour | `100` |
| `REDIS_CACHE_TTL_SECONDS` | Default cache TTL | `3600` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per user | `120` |
| `WORKER_CONCURRENCY` | Parallel AI jobs per tenant queue | `5` |

---

## 📡 API Reference

All routes are prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer <access_token>`.

### Health

Two endpoints, two audiences:

| Method | Endpoint | Auth | Description |
|:-------|:---------|:----:|:------------|
| `GET` | `/api/v1/health` | ❌ | **Liveness probe** — returns `200 OK` / `503` with no detail. Used by Azure App Service health probes and the load balancer. Safe to expose publicly. |
| `GET` | `/api/v1/health/detail` | `X-Probe-Secret` header | **Dependency detail** — checks MongoDB, both Redis instances, and worker heartbeat. Gated by a shared probe secret (stored in Key Vault, injected as an env var). Use for internal alerting and deployment verification. |

> [!IMPORTANT]
> Do not expose the detailed breakdown publicly. Per-dependency status confirms your stack, and a stale `last_worker_ping` timestamp reveals when your AI pipeline is degraded — useful timing information for abuse. The CI/CD pipeline uses `X-Probe-Secret` when verifying deployments.

**`GET /api/v1/health` (public, no body detail):**
```json
{ "status": "ok" }
```

**`GET /api/v1/health/detail` (probe-secret gated):**
```json
{
  "status": "ok",
  "dependencies": {
    "mongodb": "ok",
    "redis_cache": "ok",
    "redis_durable": "ok",
    "worker_heartbeat": "ok",
    "last_worker_ping": "2025-09-21T08:55:01Z"
  }
}
```

### Authentication

> [!NOTE]
> **Account enumeration protection:** `/auth/register` and `/auth/forgot-password` both return the same generic `200 OK` response regardless of whether the email address already exists or has an account. This is intentional — different responses on known vs. unknown addresses are a standard enumeration vector for mapping customer accounts. Any future PR changing these responses must preserve this property.

| Method | Endpoint | Auth | Description |
|:-------|:---------|:----:|:------------|
| `POST` | `/auth/register` | ❌ | Register tenant + admin user; sends verification email. Always returns `200` (see enumeration note above). Account locked until email verified. |
| `POST` | `/auth/verify-email` | ❌ | Verify email with signed token from registration email |
| `POST` | `/auth/login` | ❌ | Login; returns access token (body) + refresh token (HttpOnly cookie) |
| `POST` | `/auth/refresh` | ❌ (cookie) | Rotate refresh token; validates active membership before issuing new access token |
| `POST` | `/auth/logout` | ✅ | Blocklists JTI in `blocklistClient`; clears refresh cookie |
| `POST` | `/auth/forgot-password` | ❌ | Always returns `200` regardless of whether address has an account (see enumeration note above) |
| `POST` | `/auth/reset-password` | ❌ | Consumes reset token; invalidates all existing sessions for user |
| `POST` | `/auth/invite` | ✅ Admin | Invite a new member to the tenant |

### Notes

> All note endpoints filter on **both** `tenantId` (from JWT) and `ownerId`/role (ownership). A `404` is returned on any mismatch to avoid confirming ID existence.

| Method | Endpoint | Auth | Description |
|:-------|:---------|:----:|:------------|
| `GET` | `/notes` | ✅ | Paginated list; Members see own notes only, Admins see all |
| `POST` | `/notes` | ✅ | Create note (max 16 KB content); returns `202` with job ID for async AI pipeline |
| `GET` | `/notes/:id` | ✅ | Fetch note; Members: own notes only. Cache-aside via `cacheClient` (Redis Cache instance). |
| `PUT` | `/notes/:id` | ✅ | Update note; Members: own notes only. Invalidates cache. Re-enqueues summarization. |
| `DELETE` | `/notes/:id` | ✅ | Admins: any note in tenant. Members: own notes only. Invalidates cache. |
| `GET` | `/notes/:id/ai-status` | ✅ | Poll AI summarization status (`pending` / `completed` / `failed`) |

### Search

| Method | Endpoint | Auth | Description |
|:-------|:---------|:----:|:------------|
| `GET` | `/search?q=` | ✅ | Full-text keyword search (MongoDB text index, tenant-scoped) |
| `POST` | `/search/semantic` | ✅ | Vector search; `$vectorSearch` pre-filtered by `tenantId` before HNSW traversal |

**Semantic Search Request:**
```json
{
  "query": "budget estimates for next quarter",
  "limit": 10,
  "minScore": 0.72
}
```

**Semantic Search Response:**
```json
{
  "results": [
    {
      "id": "651abc...",
      "title": "Q4 Financial Planning",
      "snippet": "The proposed budget for Q4 includes...",
      "score": 0.891,
      "aiSummary": "A breakdown of Q4 expenditure targets across product, engineering, and marketing.",
      "createdAt": "2025-09-15T10:22:00Z"
    }
  ],
  "count": 1
}
```

### Members (Admin Only)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:----:|:------------|
| `GET` | `/members` | ✅ Admin | List all members in tenant |
| `DELETE` | `/members/:userId` | ✅ Admin | Remove member; blocklists all active JTIs; invalidates refresh token family |
| `PATCH` | `/members/:userId/role` | ✅ Admin | Promote/demote member role |

---

## 📊 Load Testing

Tests are in `load-tests/` using [k6](https://k6.io). The scenario is realistic: 70% reads, 20% semantic search, 10% writes.

```bash
k6 run load-tests/notes-read.js
```

### Results (Azure App Service P1v2 + Azure Cache for Redis Standard)

#### Baseline (No Cache)

| Metric | Value |
|:-------|:------|
| Virtual Users | 300 |
| Duration | 5 min |
| Requests/sec | ~220 RPS |
| p95 Latency | **340ms** |
| p99 Latency | 620ms |
| Error Rate | 0.00% |

#### Optimized (Redis Cache-Aside + Compound Indexes)

| Metric | Value |
|:-------|:------|
| Virtual Users | 1,000 |
| Requests/sec | **~1,450 RPS** |
| p95 Latency | **24ms** |
| p99 Latency | 48ms |
| Error Rate | 0.00% |
| Cache Hit Rate | ~91% |

> **6.5× throughput increase** and **93% p95 latency reduction** after Redis cache-aside + compound indexes on `{ tenantId: 1, createdAt: -1 }`.

---

## ☁️ Deployment

### Architecture

| Component | Azure Service | Notes |
|:----------|:-------------|:------|
| API Server | App Service (Linux, P1v2) | Node.js 20 LTS; "Always On" enabled |
| Background Worker | App Service WebJob (Continuous) | Separate deployment from API; "Always On" required |
| Database | MongoDB Atlas | M10+ cluster; Atlas Vector Search index with `tenantId` as a `filter` type field |
| Cache + Rate Limiter | Azure Cache for Redis Basic C0 | `allkeys-lru`; no persistence needed; loss is cache miss or rate-limit counter reset |
| Blocklist + Queue + Quota | Azure Cache for Redis Premium P1 | `noeviction`; AOF enabled; Premium tier is required for data persistence |
| Secrets | Azure Key Vault | All JWT secrets and API keys stored as Key Vault references |
| Logs | Azure Monitor / Log Analytics | Winston ships structured JSON to stdout; App Service streams to Log Analytics |

> [!IMPORTANT]
> **Worker deployment:** The BullMQ consumer must run as a **separate, dedicated process** — not inside the same Node.js process as the HTTP server. On Azure App Service, this is a **Continuous WebJob** deployed from the `worker/` directory. Without this:
> - Multiple scaled-out API instances each spawn their own consumer, causing unpredictable concurrent LLM calls and race conditions on job processing.
> - "Always On" must be enabled on the App Service Plan — without it, the App Service host sleeps after inactivity and kills the WebJob, silently stalling the AI queue.

### Provision Azure Resources

```bash
# Resource Group
az group create --name saas-notes-rg --location eastus

# Key Vault
az keyvault create --name saas-notes-kv \
  --resource-group saas-notes-rg --location eastus

# App Service Plan (Always On requires B1 or higher)
az appservice plan create \
  --name saas-notes-plan \
  --resource-group saas-notes-rg \
  --sku P1V2 --is-linux

# API Web App
az webapp create \
  --name saas-notes-api \
  --resource-group saas-notes-rg \
  --plan saas-notes-plan \
  --runtime "NODE:20-lts"

# Enable Always On (required for WebJob)
az webapp config set --name saas-notes-api \
  --resource-group saas-notes-rg --always-on true

# Azure Cache for Redis - Cache Instance (Basic C0)
az redis create \
  --name saas-notes-cache \
  --resource-group saas-notes-rg \
  --location eastus \
  --sku Basic --vm-size C0

# Set cache policy to allkeys-lru
az redis update --name saas-notes-cache \
  --resource-group saas-notes-rg \
  --set "redisConfiguration.maxmemory-policy=allkeys-lru"

# Azure Cache for Redis - Durable Instance (Premium P1)
# Premium tier is strictly required for AOF data persistence (Basic/Standard are in-memory only).
# Note: AOF requires an Azure Storage account connection string to persist the data.
az redis create \
  --name saas-notes-durable \
  --resource-group saas-notes-rg \
  --location eastus \
  --sku Premium --vm-size P1

# Enable AOF persistence and set noeviction (required for blocklist, queue, and quota durability)
az redis update --name saas-notes-durable \
  --resource-group saas-notes-rg \
  --set "redisConfiguration.maxmemory-policy=noeviction" "redisConfiguration.aof-backup-enabled=true" "redisConfiguration.aof-storage-connection-string-0=<your-storage-account-connection-string>"
```

### Configure Secrets via Key Vault References

```bash
# Store secrets in Key Vault
az keyvault secret set --vault-name saas-notes-kv --name JWT-ACCESS-SECRET --value "<secret>"
az keyvault secret set --vault-name saas-notes-kv --name JWT-REFRESH-SECRET --value "<secret>"
az keyvault secret set --vault-name saas-notes-kv --name OPENAI-API-KEY --value "<key>"
az keyvault secret set --vault-name saas-notes-kv --name MONGODB-URI --value "<uri>"
az keyvault secret set --vault-name saas-notes-kv --name REDIS-CACHE-URL --value "<azure-redis-cache-connection-string>"
az keyvault secret set --vault-name saas-notes-kv --name REDIS-DURABLE-URL --value "<azure-redis-durable-connection-string>"
az keyvault secret set --vault-name saas-notes-kv --name SMTP-URL --value "<smtp-connection-string>"
az keyvault secret set --vault-name saas-notes-kv --name PROBE-SECRET --value "<random-secret>"

# Assign Managed Identity to App Service
az webapp identity assign --name saas-notes-api --resource-group saas-notes-rg

# Grant Key Vault read access to the identity
az keyvault set-policy --name saas-notes-kv \
  --object-id $(az webapp identity show --name saas-notes-api \
    --resource-group saas-notes-rg --query principalId -o tsv) \
  --secret-permissions get list

# Set App Settings using Key Vault references (secrets never touch App Config)
az webapp config appsettings set \
  --name saas-notes-api --resource-group saas-notes-rg \
  --settings \
    NODE_ENV=production \
    EMAIL_FROM="noreply@yourdomain.com" \
    REDIS_CACHE_URL="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=REDIS-CACHE-URL)" \
    REDIS_DURABLE_URL="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=REDIS-DURABLE-URL)" \
    JWT_ACCESS_SECRET="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=JWT-ACCESS-SECRET)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=JWT-REFRESH-SECRET)" \
    OPENAI_API_KEY="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=OPENAI-API-KEY)" \
    MONGODB_URI="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=MONGODB-URI)" \
    SMTP_URL="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=SMTP-URL)" \
    PROBE_SECRET="@Microsoft.KeyVault(VaultName=saas-notes-kv;SecretName=PROBE-SECRET)"
```

### CI/CD (GitHub Actions)

Push to `main` triggers [`.github/workflows/azure-deploy.yml`](./.github/workflows/azure-deploy.yml):

```
Push to main
  └─ Install & test (unit + integration, incl. cross-tenant isolation test)
  └─ Build client (Vite)
  └─ Deploy API → Azure App Service (ZIP deploy)
  └─ Deploy Worker → Azure Continuous WebJob (ZIP deploy)
  └─ Health check: GET /api/v1/health → 200 OK (liveness only)
  └─ Detail check: GET /api/v1/health/detail + X-Probe-Secret → validates MongoDB, both Redis instances, worker heartbeat
```

> [!NOTE]
> **Probe secret in CI:** The `PROBE_SECRET` value reaches the App Service via its Managed Identity + Key Vault reference, but the GitHub Actions runner is a separate principal. The workflow reads the secret from a **GitHub Actions repository secret** (`secrets.PROBE_SECRET`), set once during initial setup. If the Key Vault value is rotated, the GitHub secret must be updated to match — or replace the static secret with an OIDC-federated `az keyvault secret show` step so the runner pulls the current value from Key Vault at deploy time and the two can never drift.

---

## 🛡️ Security Summary

| Layer | Implementation |
|:------|:---------------|
| **Authentication** | JWT access tokens (15 min) + HttpOnly `SameSite=Strict` refresh cookies (7 days) |
| **CSRF Protection** | `SameSite=Strict` cookie + `X-Requested-With` header check on state-mutating routes |
| **Token Revocation** | `blocklistClient` JTI blocklist (`noeviction`, AOF `everysec`); refresh endpoint checks active membership |
| **Refresh Token Reuse** | Family-based rotation; replayed rotated token revokes all sessions for that user |
| **Password Hashing** | bcrypt cost factor 10 |
| **Email Verification** | Required before tenant access granted; single-use signed link |
| **Password Reset** | Single-use, 1-hour signed token; invalidates all sessions on success |
| **Input Validation** | Zod on all request bodies including `max()` content-length checks |
| **Rate Limiting** | Redis sliding window: 10/min (auth), 120/min (API), 10/min (AI endpoints) |
| **AI Abuse Controls** | 16 KB content cap; per-tenant hourly quota counter on Durable instance (`noeviction`) |
| **Account Enumeration** | `/auth/register` and `/auth/forgot-password` always return `200` regardless of email existence |
| **Tenant Isolation** | JWT → Mongoose pre-hook → Repository → `$vectorSearch` pre-filter (four independent layers) |
| **IDOR Protection** | Note lookups filter `tenantId` AND `ownerId`; always `404` on mismatch |
| **Health Probe** | Public liveness (`/api/v1/health`) returns `200`/`503` only; detailed breakdown gated by `X-Probe-Secret` |
| **Secrets** | Azure Key Vault references; no plaintext secrets in App Service configuration |
| **HTTP Headers** | Helmet.js: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| **CORS** | Strict production origin allowlist |
| **Transport** | TLS 1.2+ enforced on Azure App Service |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | React 18, Tailwind CSS, React Query, Zustand | UI, server state, client state |
| **Backend** | Node.js 20, Express.js | REST API server |
| **Database** | MongoDB Atlas | Shared-schema multi-tenant store + vector index |
| **Cache / Rate Limit** | Redis Cache instance (`allkeys-lru`) + ioredis | Cache-aside, rate limiting |
| **Queue / Blocklist / Quota** | Redis Durable instance (`noeviction`, AOF) + BullMQ | Durable async AI pipeline, JTI blocklist, LLM spend quota |
| **AI / LLM** | OpenAI / Google Gemini | Summarization & vector embeddings |
| **Validation** | Zod | Runtime type-safe + size-bounded request validation |
| **Auth** | JWT, bcrypt | Authentication and password hashing |
| **Email** | Nodemailer + SMTP | Verification and password reset |
| **Logging** | Winston → Azure Monitor | Structured JSON logs shipped to Log Analytics |
| **Load Testing** | k6 | Performance benchmarks |
| **Hosting** | Azure App Service (API) + Continuous WebJob (Worker) | Managed Node.js hosting with Always On |
| **Redis (Cache)** | Azure Cache for Redis Basic C0 | `allkeys-lru`; cache + rate-limit counters |
| **Redis (Durable)** | Azure Cache for Redis Premium P1 | `noeviction` + AOF; blocklist + queue + quota |
| **Secrets** | Azure Key Vault | Managed secrets via Key Vault references |
| **CI/CD** | GitHub Actions | Test → build → deploy → liveness + detail health check |

---

## 🔄 Disaster Recovery

| Resource | Strategy |
|:---------|:---------|
| **MongoDB Atlas** | Continuous cloud backup with PITR (7 days); replica set with automatic failover |
| **Redis Cache** (Basic C0) | In-memory only (no persistence); acceptable to lose; cache misses fall through to MongoDB, rate-limit counters reset (low severity) |
| **Redis Durable** (Premium P1) | AOF persistence to Azure Storage; Premium tier ensures blocklist, queue, and quota counters survive full-node failure/restarts |
| **App Service** | Two-instance minimum in production; Azure deployment slots for zero-downtime releases |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature-name`
5. Open a Pull Request

Please ensure all existing tests pass and new features include integration test coverage, especially for any code paths that touch multi-tenant data access.

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

---

<div align="center">
Made with ☕ by <a href="https://github.com/Anurag-dev1">@Anurag</a>
</div>
