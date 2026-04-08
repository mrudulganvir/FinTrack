# 💰 PFMA — Personal Finance Management App

> A complete, modern, and realistic personal finance management system built for Indian users — featuring expense tracking, smart budgets, visual reports, AI chatbot, investment advisory, and more — all in ₹ Indian Rupees.

![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%2F%20CSS%20%2F%20JS-yellow?style=flat-square&logo=javascript)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square&logo=postgresql)
![Currency](https://img.shields.io/badge/Currency-Indian%20Rupee%20₹-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features-at-a-glance)
- [Detailed Feature Breakdown](#-detailed-feature-breakdown)
- [Workflow](#-workflow)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Development Plan](#-development-plan)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**PFMA (Personal Finance Management App)** is a full-featured personal finance tracker designed specifically for Indian users. It helps individuals take control of their money by tracking income, expenses, budgets, loans, and investments — all from one unified dashboard.

The app combines clean UI, automated categorization, visual analytics, AI-powered insights, and personalized investment advisory to turn raw financial data into actionable decisions — making it genuinely useful for everyday financial management.

---

## ✨ Features at a Glance

| # | Feature | Description |
|---|---|---|
| 1 | 🔐 User Authentication | Secure JWT-based login with biometric support |
| 2 | 💳 Live Balance Tracking | Real-time balance = Income − Expenses |
| 3 | 📝 Expense Tracker | Log daily expenses with category, date & description |
| 4 | 🤖 Auto Categorization | NLP + scikit-learn based expense classification |
| 5 | 📈 Income Tracker | Track all income sources with trend insights |
| 6 | 🎯 Budget Management | Category-wise budgets with overspend alerts |
| 7 | 🤝 Lending & Borrowing Tracker | Track money lent/borrowed with due dates & status |
| 8 | 📊 Reports & Analytics | Monthly & yearly visual charts via Chart.js |
| 9 | ₹ Indian Rupee Support | Full Indian currency formatting & localization |
| 10 | 💡 Smart Insights | Personalized, rule-based + ML recommendations |
| 11 | 📉 Investment Advisory | Risk-based investment guidance from earnings, savings & expenses |
| 12 | 🤖 Finance Chatbot | Mistral AI-powered assistant for finance queries |
| 13 | 📤 Data Export & Sharing | PDF (ReportLab) and CSV export of financial reports |
| 14 | ♿ Accessibility & UX | Dark mode, sticky buttons, minimal-click design |

---

## 🔍 Detailed Feature Breakdown

### 1️⃣ User Authentication & Secure Access

The application starts with a secure login system to protect sensitive financial data.

**Implementation:**
- Email & password-based login
- **JWT (JSON Web Tokens)** for session management and route protection
- Biometric authentication option (fingerprint / face — UI level)
- Auto-lock after inactivity
- Session timeout handling

**Files involved:** `app/auth/security.py`, `app/core/security.py`, `app/routes/auth_route.py`, `app/schemas/user_schema.py`

---

### 2️⃣ Live Balance Tracking

The dashboard displays the current available balance at all times.

**How it works:**
```
Available Balance = Total Income − Total Expenses
```
- Computed dynamically via `balance_service.py`
- Updated whenever a transaction is added or modified
- Displayed prominently in ₹ on the main dashboard

**Files involved:** `app/services/balance_service.py`, `app/routes/meta_routes.py`

---

### 3️⃣ Easy Expense Tracker

Users can quickly record daily expenses with minimal effort.

**Features:**
- Add expense: amount, category, date, and description
- Expense list view with filters (by date / category)
- Color-coded categories for visual clarity

**Files involved:** `app/routes/transaction_route.py`, `app/schemas/transaction_schema.py`

---

### 4️⃣ Automatic Expense Categorization

The application automatically assigns categories to expenses using ML.

**How it works:**
- **NLP preprocessing** via `preprocess.py` — cleans and tokenizes expense descriptions
- Trained **scikit-learn classifier** saved as `categorizer.pkl`
- Training notebook: `categorization_model.ipynb`
- Training data: `transactions_dataset.csv`
- Examples:
  - `"Swiggy"` → 🍔 Food
  - `"Uber"` → 🚗 Transport
  - `"Netflix"` → 🎬 Entertainment

**Files involved:** `app/model/categorization_model.ipynb`, `app/model/categorizer.pkl`, `app/model/preprocess.py`, `app/model/transactions_dataset.csv`, `app/services/categorization_service.py`

---

### 5️⃣ Income Tracker with Insights

Tracks all income sources and analyzes trends over time.

**Income Types Supported:**
- 💼 Salary
- 💻 Freelance
- 📦 Passive Income
- 🔁 Other Sources

**Insights Provided:**
- Monthly income growth or decline
- Income source stability analysis
- Income vs. expense comparison

**Files involved:** `app/routes/transaction_route.py`, `app/services/insight_service.py`

---

### 6️⃣ Dynamic Budget Management

Users can set and manage budgets for different spending categories.

**Features:**
- Monthly category-wise budget limits
- Visual progress bars via Chart.js
- Overspending alerts (UI-based)
- Budget suggestions based on past spending patterns

**Files involved:** `app/routes/budget_routes.py`, `app/schemas/budget_schema.py`, `app/services/budget_service.py`

---

### 7️⃣ Lending & Borrowing Tracker

Tracks money lent to others or borrowed from others.

**Features:**
- Separate tracking for:
  - 💸 Money Lent (to others)
  - 🏦 Money Borrowed (from others)
- Due date tracking for repayments
- Status indicators: `Pending` / `Settled`

**Files involved:** `app/routes/loan_routes.py`, `app/schemas/loan_schema.py`

---

### 8️⃣ Reports & Analytics (Monthly & Yearly)

Provides detailed visual financial summaries using **Chart.js**.

**Monthly Reports:**
- 📊 Category-wise spending — Bar Chart
- 🥧 Expense distribution — Pie Chart
- 📈 Daily spending trend — Line Chart

**Yearly Reports:**
- 📅 Month-wise expense trend
- ⚖️ Income vs. expense comparison
- 💰 Savings trend over the year

**Export Options:**
- 📄 PDF via **ReportLab**
- 📊 CSV via **Python csv module**

**Files involved:** `app/routes/report_routes.py`

---

### 9️⃣ Indian Rupee (₹) Support

All financial values are displayed in Indian currency format.

**Features:**
- ₹ symbol used consistently across the entire app
- Indian number formatting: ₹ 1,25,000 / ₹ 12,500
- Clear color distinction: income (green), expense (red), savings (blue)

---

### 🔟 Smart Insights & Actionable Recommendations

Personalized financial suggestions generated by `insight_service.py`.

**Example Insights:**
- *"You spent 22% more on food this month."*
- *"Weekend spending is consistently higher."*
- *"You can save ₹3,000 by reducing discretionary expenses."*

**Type:** Rule-based + ML-assisted insights engine

**Files involved:** `app/services/insight_service.py`

---

### 1️⃣1️⃣ Investment Advisory (Based on Earnings, Savings & Expenses)

Provides personalized investment guidance dynamically calculated from the user's **actual income, savings, and spending behavior** — not generic advice.

**How it works:**
- Analyzes monthly income, total expenses, and net savings
- Calculates **Savings Rate** = (Savings / Income) × 100
- Assigns a **Risk Profile** based on the savings rate and spending stability:

| Savings Rate | Risk Profile | Suggested Investment |
|---|---|---|
| < 10% | 🔴 Conservative | Fixed Deposits, Recurring Deposits |
| 10% – 30% | 🟡 Moderate | Debt Mutual Funds, Balanced Funds |
| > 30% | 🟢 Aggressive | Equity Mutual Funds, SIPs, Index Funds |

**Dynamic Factors Considered:**
- Income consistency (salary vs freelance fluctuation)
- High-expense categories (flags lifestyle inflation)
- Loan burden (reduces investable surplus)
- Month-over-month savings trend

**Example Advisory:**
- *"Your savings rate is 35%. Based on your stable income and low loan burden, you can consider Equity SIPs for long-term growth."*
- *"Your expenses exceeded income last month. Focus on reducing discretionary spending before investing."*

> ⚠️ **Disclaimer:** All suggestions are educational only. No real trading or financial transactions are involved.

**Files involved:** `app/services/insight_service.py`, `app/routes/meta_routes.py`

---

### 1️⃣2️⃣ Chatbot — Finance Assistant (Mistral AI)

An AI-powered chatbot built on **Mistral AI** to assist users with financial queries.

**Capabilities:**
- Natural language answers:
  - *"How much did I spend this month?"*
  - *"Show my food expenses for October."*
  - *"What is my current balance?"*
  - *"Am I overspending on transport?"*
- App navigation assistance
- Powered by Mistral AI API (extendable)

**Files involved:** `app/routes/chat_routes.py`, `app/schemas/chat_schema.py`, `app/services/chatbot_service.py`

---

### 1️⃣3️⃣ Data Export & Sharing

Users can export their financial data in multiple formats.

**Features:**
- 📄 **PDF Reports** — generated via **ReportLab** (monthly / yearly summaries)
- 📊 **CSV Export** — raw transaction data via **Python csv module**
- Shareable summaries for accountants, family, or tax filing

**Files involved:** `app/routes/report_routes.py`

---

### 1️⃣4️⃣ Accessibility & UX Enhancements

Designed for ease of use in daily interactions.

**Features:**
- Sticky "Add Expense" button always accessible
- Simple, intuitive navigation
- Minimal clicks for frequent actions
- 🌙 Dark mode for reduced eye strain

**Files involved:** `frontend/prototype.html`, `frontend/style.css`, `frontend/script.js`

---

## 🔄 Workflow

### User Onboarding Flow

```
User Opens App
      │
      ▼
Login / Register
(Email + Password → JWT Token issued)
(Biometric option at UI level)
      │
      ▼
Dashboard Loads
(Live Balance + Recent Transactions + Insights)
      │
      ├──► Add Expense / Income → Auto Categorized → Balance Updated
      ├──► Set / Monitor Budgets → Overspend Alerts
      ├──► View Reports → Charts via Chart.js → Export PDF/CSV
      ├──► Track Loans / Lending → Status: Pending / Settled
      ├──► Investment Advisory → Risk Profile + Suggestions
      └──► Chat with Mistral AI Finance Bot
```

---

### Expense Tracking & Auto Categorization Flow

```
User Adds Expense (Amount + Description + Date)
                │
                ▼
        Categorization Service
        (preprocess.py cleans description)
                │
                ▼
        scikit-learn Classifier (categorizer.pkl)
        Predicts Category: Food / Transport / etc.
                │
                ▼
        Transaction Saved to PostgreSQL DB
                │
        ┌───────┼───────────────┐
        ▼       ▼               ▼
  Balance   Budget          Insights
  Updated   Progress        Refreshed
            Updated
```

---

### Investment Advisory Flow

```
User's Financial Data (from PostgreSQL)
             │
             ▼
     insight_service.py
             │
    ┌────────┼──────────────┐
    ▼        ▼              ▼
 Monthly   Loan         Expense
 Savings   Burden       Stability
 Rate      Check        Analysis
    │        │              │
    └────────┴──────────────┘
             │
             ▼
     Risk Profile Assigned
  (Conservative / Moderate / Aggressive)
             │
             ▼
  Personalized Investment Suggestions
  Displayed on Dashboard & via Chatbot
```

---

### Report Generation Flow

```
User Requests Report (Monthly / Yearly)
             │
             ▼
  Fetch Transactions from PostgreSQL
             │
     ┌───────┼───────────────┐
     ▼       ▼               ▼
  Bar      Pie            Line
  Chart    Chart          Chart
 (Category)(Distribution)(Trend)
     │
     ▼
  Chart.js renders on frontend
     │
     ▼
  Export Option:
  ├── PDF → ReportLab
  └── CSV → Python csv module
```

---

### Chatbot Interaction Flow

```
User Types a Query
       │
       ▼
chat_routes.py receives request
       │
       ▼
chatbot_service.py
(Attaches user's financial context from DB)
       │
       ▼
Mistral AI API call
       │
       ▼
AI generates context-aware financial response
       │
       ▼
Response displayed in Chat UI
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML, CSS, JavaScript (`prototype.html`, `style.css`, `script.js`) |
| **Backend** | Python — FastAPI (`main.py`) |
| **Database** | PostgreSQL (`app/database/db.py`, `models.py`) |
| **Auto Categorization** | Python NLP (`preprocess.py`) + scikit-learn (`categorizer.pkl`) |
| **Charts & Visualization** | Chart.js (via frontend `script.js`) |
| **AI Chatbot** | Mistral AI API (`chatbot_service.py`) |
| **Authentication** | JWT Tokens (`app/auth/security.py`, `app/core/security.py`) + Biometric (UI) |
| **PDF Export** | ReportLab (`report_routes.py`) |
| **CSV Export** | Python `csv` module (`report_routes.py`) |
| **Config & Env** | `app/core/config.py`, `.env` |
| **Version Control** | Git + GitHub |

---

## 📁 Project Structure

```
FINTRACK/
│
├── .env                            # Environment variables (API keys, DB URL)
├── .gitignore
├── requirements.txt                # Python dependencies
├── README.md
│
├── frontend/                       # Frontend — HTML / CSS / JS
│   ├── prototype.html              # Main app UI
│   ├── script.js                   # Chart.js, API calls, interactivity
│   └── style.css                   # Styling & dark mode
│
└── app/                            # Backend — FastAPI
    ├── main.py                     # FastAPI app entry point
    │
    ├── auth/                       # Authentication
    │   └── security.py             # Password hashing, token validation
    │
    ├── core/                       # Core Configuration
    │   ├── config.py               # App settings, env variables
    │   ├── enums.py                # Enumerations (categories, status, etc.)
    │   └── security.py             # JWT token creation & verification
    │
    ├── database/                   # Database Layer
    │   ├── db.py                   # PostgreSQL connection & session
    │   └── models.py               # SQLAlchemy ORM models
    │
    ├── model/                      # ML Categorization Model
    │   ├── categorization_model.ipynb  # Model training notebook
    │   ├── categorizer.pkl             # Trained scikit-learn classifier
    │   ├── preprocess.py               # NLP preprocessing utilities
    │   └── transactions_dataset.csv    # Training dataset
    │
    ├── routes/                     # API Route Handlers
    │   ├── auth_route.py           # /auth — login, register
    │   ├── budget_routes.py        # /budget — CRUD
    │   ├── chat_routes.py          # /chat — chatbot endpoint
    │   ├── loan_routes.py          # /loans — lending & borrowing
    │   ├── meta_routes.py          # /meta — balance, advisory
    │   ├── report_routes.py        # /reports — PDF & CSV export
    │   └── transaction_route.py    # /transactions — expenses & income
    │
    ├── schemas/                    # Pydantic Request/Response Schemas
    │   ├── budget_schema.py
    │   ├── chat_schema.py
    │   ├── loan_schema.py
    │   ├── transaction_schema.py
    │   └── user_schema.py
    │
    └── services/                   # Business Logic Layer
        ├── balance_service.py          # Live balance calculation
        ├── budget_service.py           # Budget tracking & alerts
        ├── categorization_service.py   # Auto-categorization using ML model
        ├── chatbot_service.py          # Mistral AI chatbot integration
        └── insight_service.py          # Smart insights & investment advisory
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL installed and running
- A Mistral AI API key
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mrudulganvir/FinTrack

# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Fill in the values below
```

### Environment Variables (`.env`)

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/pfma_db

# JWT Authentication
SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60

# Mistral AI Chatbot
MISTRAL_API_KEY=your_mistral_api_key_here

# App
APP_ENV=development
```

### Database Setup

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE pfma_db;"

# Run migrations (tables auto-created via SQLAlchemy on startup)
python -c "from app.database.db import Base, engine; from app.database import models; Base.metadata.create_all(bind=engine)"
```

### Running the App

```bash
# Start the FastAPI backend
uvicorn app.main:app --reload

# Open the frontend
# Simply open frontend/prototype.html in your browser
# or serve it via a local server:
cd frontend && python -m http.server 3000
```

**API Docs available at:** `http://localhost:8000/docs` (Swagger UI)
**Website Available at:** `https://pfma-8c7b8.web.app/` (Website link)

---

## 🗺️ Development Plan

### Phase 1 — Foundation ✅
- [x] Project structure setup
- [x] PostgreSQL DB connection (`db.py`, `models.py`)
- [x] Core config & enums
- [x] JWT Authentication (`auth_route.py`, `security.py`)

### Phase 2 — Core Tracking
- [x] Transaction routes (expense + income)
- [x] Live balance service
- [x] Loan / lending tracker
- [ ] Indian ₹ formatting across all responses

### Phase 3 — Smart Categorization
- [x] Training dataset (`transactions_dataset.csv`)
- [x] NLP preprocessing (`preprocess.py`)
- [x] scikit-learn model training (`categorization_model.ipynb`)
- [x] Saved model (`categorizer.pkl`)
- [x] Categorization service integration

### Phase 4 — Budgets & Insights
- [x] Budget CRUD routes & service
- [x] Overspending alerts
- [x] Insight service (rule-based + ML)
- [x] Investment advisory engine

### Phase 5 — Reports & Export
- [ ] Chart.js integration on frontend
- [ ] PDF export via ReportLab
- [ ] CSV export via Python csv module

### Phase 6 — Chatbot
- [x] Mistral AI integration (`chatbot_service.py`)
- [x] Chat routes & schema
- [ ] Context injection (user's financial data into prompts)

### Phase 7 — Frontend & Polish
- [ ] Complete `prototype.html` UI
- [ ] Dark mode (`style.css`)
- [ ] Responsive design
- [ ] Full `script.js` with Chart.js charts

### Phase 8 — Testing & Deployment
- [ ] Unit tests for services
- [ ] API integration tests
- [ ] Docker containerization
- [ ] Cloud deployment

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "Add: your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

Please write tests for new features and follow the existing code conventions.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🧠 TL;DR

PFMA is a complete personal finance management system offering:

- ✅ JWT-secured access with biometric support
- ✅ Expense, income, balance, and loan tracking
- ✅ NLP + scikit-learn auto expense categorization
- ✅ Chart.js visual reports + ReportLab PDF & CSV export
- ✅ ₹-based Indian finance support
- ✅ Mistral AI chatbot for finance queries
- ✅ Dynamic investment advisory based on real earnings, savings & expenses

> Built to make financial awareness simple, smart, and accessible for every Indian user.

---

<p align="center">Made with ❤️ for smarter financial decisions.</p>
