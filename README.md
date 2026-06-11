# ⚡ Reachly — AI-Native CRM for Starbucks India

> **"Describe the goal. Reachly does the rest."**

Reachly is a production-ready, AI-powered CRM platform built for Starbucks India. Instead of manually configuring campaigns, you simply describe your goal in plain English — Reachly's multi-agent AI pipeline handles strategy, audience segmentation, content generation, channel selection, and performance prediction automatically.

---

## ✨ Features

- 🤖 **5-Agent AI Pipeline** — Strategy → Audience → Content → Channel → Prediction, streamed live
- 📊 **Live Campaign Monitor** — Real-time event feed (sent → delivered → read → opened → clicked → converted)
- 🎯 **Smart Audience Targeting** — SQL-driven segmentation from natural language goal
- 💬 **Personalized Content** — AI-generated messages with unique discount codes
- 📈 **Insights Report** — AI post-campaign analysis, cached to DB, PDF download
- 🛍 **Conversion Attribution** — Tracks orders attributed to each campaign
- 🌙 **Light / Dark Mode** — Persisted across sessions
- 🔐 **Simple Auth Gate** — Email + password login with httpOnly cookie session
- 📁 **CSV Data Upload** — Upload customers and orders data from the UI

---

## 🗂 Project Structure

```
reachly/
├── frontend/          # Next.js 16 (App Router) + TypeScript
├── backend/           # FastAPI (Python 3.11+) — AI agents + API
├── channel_service/   # FastAPI — async delivery simulation + callbacks
└── supabase/
    └── migrations/    # PostgreSQL schema SQL files
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key (or Gemini)

---

### 1. Clone the repo

```bash
git clone https://github.com/BharathK05/Reachly.git
cd Reachly
```

---

### 2. Supabase — Run migrations

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Run **each migration file** in order:

```
supabase/migrations/001_initial_schema.sql                    ← Run first
supabase/migrations/002_add_campaign_name.sql                 ← Run second
supabase/migrations/003_insights_cache_and_new_statuses.sql   ← Run third
```

Copy-paste each file's contents into the SQL Editor and click **Run**.

---

### 3. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

**Create `backend/.env`:**

```env
OPENAI_API_KEY=sk-proj-your_openai_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
CHANNEL_SERVICE_URL=http://localhost:8001
CRM_CALLBACK_URL=http://localhost:8000/api/events/callback
FRONTEND_URL=http://localhost:3000
```

> **Where to get these:**
> - `OPENAI_API_KEY` → [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - `SUPABASE_URL` → Supabase Dashboard → Settings → API → Project URL
> - `SUPABASE_SERVICE_KEY` → Supabase Dashboard → Settings → API → `service_role` key

**Start the backend:**

```bash
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

✅ Backend running at **http://localhost:8000**

---

### 4. Channel Service setup

```bash
cd channel_service
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

**Create `channel_service/.env`:**

```env
CRM_CALLBACK_URL=http://localhost:8000/api/events/callback
```

**Start the channel service:**

```bash
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

✅ Channel service running at **http://localhost:8001**

---

### 5. Frontend setup

```bash
cd frontend
npm install
```

**Create `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Auth credentials
AUTH_USER=starbucks@gmail.com
AUTH_PASS=starbucks123
```

> `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase Dashboard → Settings → API → `anon public` key

**Start the frontend:**

```bash
npm run dev
```

✅ Frontend running at **http://localhost:3000**

---

## 🔐 Logging In

Visit **http://localhost:3000** — you'll be redirected to the Reachly login page.

| Field | Value |
|-------|-------|
| **Email** | `starbucks@gmail.com` |
| **Password** | `starbucks123` |

> Change by editing `AUTH_USER` and `AUTH_PASS` in `frontend/.env.local` and restarting the frontend.

---

## 📋 Running All 3 Services (VS Code)

Open **3 terminal tabs** and run one per tab:

| Terminal | Command |
|----------|---------|
| **Backend** | `cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000` |
| **Channel Service** | `cd channel_service && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001` |
| **Frontend** | `cd frontend && npm run dev` |

> ⚠️ All 3 must be running for the monitor events to work. If monitor shows all-pending, check channel service is on port 8001.

---

## 🧠 How the AI Agent Pipeline Works

When you launch a campaign from the Studio:

| Step | Agent | What it does |
|------|-------|-------------|
| 1 | **Strategy Agent** | Classifies goal → reactivation / loyalty / promo / acquisition |
| 2 | **Audience Agent** | Queries Supabase with AI-derived filters, returns matching customers |
| 3 | **Content Agent** | Generates personalized message + unique discount code (e.g. `SB-XXXX`) |
| 4 | **Channel Agent** | Picks WhatsApp / SMS / Email based on budget per-recipient cost |
| 5 | **Prediction Agent** | Forecasts open rate, CTR, conversion rate, estimated conversions |

Results stream live to the **Agent Timeline** via Server-Sent Events (SSE).

---

## 📡 Communication Delivery Loop

The system models the full real-world message delivery lifecycle:

```
CRM Backend  ──POST /send──►  Channel Service
                                    │
                    ◄──POST /api/events/callback── (per event, async)
```

**Event funnel per recipient (simulated):**

```
sent → delivered → read → opened → clicked → converted
       (5% fail)   (50%)   (70%)    (30%)     (15%)
```

- **`read`** = WhatsApp double-blue-tick (recipient saw the message)
- **`converted`** = order attributed to this campaign (*"order came because of this communication"*)

All events are stored in `communication_events` with full audit trail. `communication_logs` tracks the highest-funnel status per recipient.

---

## 📊 Data Format (CSV Upload)

Upload at **Dashboard → Import Data**.

### customers.csv
```csv
id,name,email,phone,city,tier,total_spend,days_since_last_purchase,total_orders
uuid-1,Priya Sharma,priya@email.com,9876543210,Mumbai,Gold,8500,12,23
```

### orders.csv
```csv
id,customer_id,product_name,amount,order_date
uuid-a,uuid-1,Caramel Latte,380,2024-05-15
```

> Need test data? Use ChatGPT:
> *"Generate 300 rows of customers.csv and 1200 rows of orders.csv for a Starbucks India CRM. Include tiers (Gold/Silver/Bronze), realistic Indian names, spend range ₹500–₹25000, days_since_last_purchase 1–180."*

---

## ⚖️ Scale Tradeoffs & Design Decisions

> Conscious decisions made for this scope, with notes on production scale.

### Current Architecture
| What | How | Why |
|------|-----|-----|
| DB inserts on approval | Per-recipient round trip (O(n)) | Simple; fine for 300 customers |
| Channel service dispatch | `asyncio.gather()` on all recipients | Works up to ~5K in-process |
| Monitor refresh | 3s polling from frontend | Simple, reliable for demo |
| Event storage | Single `communication_events` table | No partitioning needed at demo scale |
| Insights | Cached as text in `campaigns.insights_cache` | Avoids re-generating on revisit |

### At 10,000 Customers
| Problem | Solution |
|---------|----------|
| O(n) DB inserts (10K round trips) | Batch insert in 500-row chunks via Supabase bulk API |
| 10K concurrent coroutines in channel service | `asyncio.Semaphore(100)` to rate-limit concurrent dispatches |
| Monitor polling (every user polls every 3s) | Switch to WebSocket or SSE push |
| Event table growth | Partition by `campaign_id` or `occurred_at` |

### At 100,000+ Customers
| Problem | Solution |
|---------|----------|
| Audience query latency | Add DB indexes on `total_spend`, `days_since_last_purchase`, `tier` |
| Callback throughput (100K events/campaign) | Queue via Redis/SQS + async worker pool |
| AI latency for every campaign | Cache prompt outputs per campaign_type; LLM only for personalization |
| Multi-brand SaaS | Add `brand_id` on all tables; Supabase RLS for tenant isolation |

### What Was Deliberately NOT Built
| Feature | Reason |
|---------|--------|
| Real channel integration (Twilio/etc.) | Assignment explicitly wants a stub; correct stubbing is more signal |
| JWT/OAuth auth | httpOnly cookie is correct scope for a demo CRM |
| Campaign scheduling | Would use `pg_cron` or a queue; out of scope for this assignment |
| A/B testing | Easy extension: split audience, track per-variant; not required |

---

## 🔄 Switching AI Providers

All AI calls go through `backend/ai_client.py` — swap by editing **one file**.

**OpenAI (current default):**
```python
from openai import OpenAI
_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def generate(prompt: str) -> str:
    response = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()
```

**Switch to Gemini:**
```python
from google import genai
_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def generate(prompt: str) -> str:
    response = _client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    return response.text.strip()
```

---

## 🌐 Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| **Frontend** | [Vercel](https://vercel.com) | Connect GitHub, set `NEXT_PUBLIC_API_URL` to Railway backend URL |
| **Backend** | [Railway](https://railway.app) | Root dir `/backend`, set all env vars |
| **Channel Service** | [Railway](https://railway.app) | Root dir `/channel_service`, set `CRM_CALLBACK_URL` to backend URL |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript |
| **Backend** | FastAPI, Python 3.11+, Uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **AI** | OpenAI GPT-4o-mini (swappable via `ai_client.py`) |
| **Streaming** | Server-Sent Events (SSE) |
| **Auth** | httpOnly cookie + Next.js proxy middleware |

---

## 📁 Key Files Reference

```
backend/
├── ai_client.py              ← Swap AI provider here (single file)
├── agents/
│   ├── orchestrator.py       ← SSE streaming multi-agent pipeline
│   ├── strategy_agent.py     ← Goal classification
│   ├── audience_agent.py     ← NL → SQL filter → customer query
│   ├── content_agent.py      ← Message + discount code generation
│   ├── channel_agent.py      ← Channel selection by CPM
│   └── prediction_agent.py   ← Performance forecasting
├── routers/
│   ├── campaigns.py          ← Campaign CRUD, SSE run, approve, insights (cached)
│   ├── data.py               ← CSV upload, stats, customer/order list endpoints
│   └── events.py             ← Delivery callback handler (read + converted)
└── models/schemas.py

channel_service/
└── main.py                   ← Async delivery simulation, retry callbacks

frontend/
├── app/
│   ├── dashboard/            ← Stats + clickable customer/order modals
│   ├── studio/               ← Campaign goal input
│   ├── campaigns/            ← Vertical campaign list with search
│   ├── timeline/[id]/        ← Live agent timeline (cached on revisit)
│   ├── monitor/[id]/         ← Delivery monitor (read + converted events)
│   ├── insights/[id]/        ← AI insights report (cached, PDF export)
│   └── login/                ← Reachly branded auth page
├── components/
│   ├── Sidebar.tsx            ← Collapsible nav + theme toggle
│   └── ThemeProvider.tsx      ← Light/dark mode context
├── lib/
│   ├── api.ts                ← All API calls (single source of truth)
│   └── types.ts              ← TypeScript interfaces
└── proxy.ts                  ← Auth gate middleware
```

---

## 📄 License

MIT — built for educational and demonstration purposes.

---

<div align="center">
  <strong>Built with ⚡ by Reachly · AI-Native CRM Platform</strong>
</div>
