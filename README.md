# ⚡ Reachly — AI-Native CRM for Starbucks India

> **"Describe the goal. Reachly does the rest."**

Reachly is a production-ready, AI-powered CRM platform built for Starbucks India. Instead of manually configuring campaigns, you simply describe your goal in plain English — Reachly's multi-agent AI pipeline handles strategy, audience segmentation, content generation, channel selection, and performance prediction automatically.

---

## ✨ Features

- 🤖 **5-Agent AI Pipeline** — Strategy → Audience → Content → Channel → Prediction
- 📊 **Live Campaign Monitor** — Real-time SSE event feed as messages deliver
- 🎯 **Smart Audience Targeting** — SQL-driven segmentation from customer/order data
- 💬 **Personalized Content** — AI-generated messages with unique discount codes
- 📈 **Insights Report** — Natural language post-campaign analysis
- 🌙 **Light / Dark Mode** — Persisted across sessions
- 🔐 **Simple Auth Gate** — Username + password login with httpOnly cookie session
- 📁 **CSV Data Upload** — Upload customers and orders data directly from the UI

---

## 🗂 Project Structure

```
reachly/
├── frontend/          # Next.js 14 (App Router) + Tailwind + shadcn/ui
├── backend/           # FastAPI (Python 3.11+) — AI agents + API
├── channel_service/   # FastAPI — async delivery simulation
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
supabase/migrations/001_initial_schema.sql   ← Run first
supabase/migrations/002_add_campaign_name.sql ← Run second
```

Simply copy-paste each file's contents into the SQL Editor and click **Run**.

---

### 3. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
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

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
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

# Install dependencies
npm install
```

**Create `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Auth credentials (change these!)
AUTH_USER=admin
AUTH_PASS=reachly123
```

> **Where to get the anon key:**
> Supabase Dashboard → Settings → API → `anon` `public` key

**Start the frontend:**

```bash
npm run dev
```

✅ Frontend running at **http://localhost:3000**

---

## 🔐 Logging In

Visit **http://localhost:3000** — you'll be redirected to the Starbucks India login portal.

Default credentials:
- **Username:** `admin`
- **Password:** `reachly123`

> Change these by editing `AUTH_USER` and `AUTH_PASS` in `frontend/.env.local` and restarting the frontend.

---

## 📋 Running All 3 Services (VS Code)

Open 3 separate terminal tabs in VS Code and run one command per tab:

| Terminal | Command |
|----------|---------|
| **Backend** | `cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000` |
| **Channel Service** | `cd channel_service && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001` |
| **Frontend** | `cd frontend && npm run dev` |

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

## 📊 Data Format (CSV Upload)

Upload your data at **Dashboard → Upload CSV Files**.

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

> Need test data? Use ChatGPT with this prompt:
> *"Generate 300 rows of customers.csv and 1200 rows of orders.csv for a Starbucks India CRM. Include tiers (Gold/Silver/Bronze), realistic Indian names, spend range ₹500–₹25000, days_since_last_purchase 1–180."*

---

## 🔄 Switching AI Providers

All AI calls go through `backend/ai_client.py` — swap provider by editing **one file**.

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
| **Frontend** | [Vercel](https://vercel.com) | Connect GitHub repo, set env vars in Vercel dashboard |
| **Backend** | [Railway](https://railway.app) | Point to `/backend`, set env vars, exposes a public URL |
| **Channel Service** | [Railway](https://railway.app) | Point to `/channel_service`, set `CRM_CALLBACK_URL` to backend URL |

Update `NEXT_PUBLIC_API_URL` in Vercel to point to your Railway backend URL.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **AI** | OpenAI GPT-4o-mini (swappable) |
| **Streaming** | Server-Sent Events (SSE) |
| **Auth** | httpOnly cookie, Next.js proxy middleware |

---

## 📁 Key Files Reference

```
backend/
├── ai_client.py          ← Swap AI provider here
├── agents/
│   ├── orchestrator.py   ← SSE streaming pipeline
│   ├── strategy_agent.py
│   ├── audience_agent.py
│   ├── content_agent.py
│   ├── channel_agent.py
│   └── prediction_agent.py
├── routers/
│   ├── campaigns.py      ← Campaign CRUD + agent trigger
│   ├── data.py           ← CSV upload + stats
│   └── events.py         ← Delivery callback handler
└── models/schemas.py

frontend/
├── app/
│   ├── dashboard/        ← Stats + data upload
│   ├── studio/           ← Campaign goal input
│   ├── campaigns/        ← All campaigns list
│   ├── timeline/[id]/    ← Live agent timeline
│   ├── monitor/[id]/     ← Delivery monitor
│   ├── insights/[id]/    ← AI insights report
│   └── login/            ← Auth page
├── components/
│   ├── Sidebar.tsx        ← Collapsible nav + user card
│   ├── ThemeProvider.tsx  ← Light/dark mode context
│   └── ConditionalLayout.tsx
├── lib/
│   ├── api.ts            ← All fetch calls
│   └── types.ts          ← TypeScript interfaces
└── proxy.ts              ← Auth gate middleware
```

---

## 📄 License

MIT — built for educational and demonstration purposes.

---

<div align="center">
  <strong>Built with ⚡ by Reachly · AI-Native CRM Platform</strong>
</div>
