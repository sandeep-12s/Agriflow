# AgriFlow

**Turn Every Harvest into Better Value.**

A mobile-first decision-support platform that helps farmers decide whether to
sell, store, transport, or process their produce right after harvest.

> Hackathon problem statement: *Student innovation — developing solutions to
> enhance the primary sector of India (agriculture) and to manage and process
> agriculture produce.*

## Status

✅ All 15 build stages complete. AgriFlow is a fully working MVP —
auth, produce management, market prices, the Sell/Store/Process/
Alternative-Buyer recommendation engine, buyer marketplace, storage
and processing marketplaces, a bilingual AI assistant, analytics, an
automated test suite, UI polish, and deployment configs. See
`presentation/PRESENTATION.md` and `presentation/AgriFlow_Presentation.pptx`
for the hackathon pitch materials.

## Tech stack

| Layer    | Choice                              |
|----------|--------------------------------------|
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend  | Python + FastAPI                     |
| Database | SQLite for dev, PostgreSQL-ready     |
| Auth     | JWT + bcrypt (added in Step 3)       |

## Project structure

```
agriflow/
├── backend/     FastAPI app
└── frontend/    React app
```

See `backend/README` (inline in code comments for now) and this file's
"Running it" section below for setup.

## Running it

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000 — visit http://localhost:8000/health.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at http://localhost:5173.

### Database

Tables are created automatically the first time the backend starts
(`uvicorn app.main:app --reload`). To load demo data:

```bash
cd backend
python -m app.db.seed
```

### AI Assistant (optional)

The chat assistant works out of the box using built-in fallback
answers — no setup required. To get live AI-generated replies instead,
add a key to `backend/.env`:

```
ANTHROPIC_API_KEY=your-key-here
```

Get a key at https://console.anthropic.com. Every chat response tells
you which path answered ("AI response" vs "Quick answer").

## Testing

Automated backend tests (pytest) and a security checklist live in
`SECURITY.md`. Quick start:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Demo data disclosure

All market prices, buyer offers, storage costs, and processing figures shown
in this app are **demo/estimated data** for hackathon demonstration, not
live mandi prices, unless explicitly wired to a verified data source.

## Roadmap

1. ✅ Project setup
2. ✅ Database (models, seed data)
3. ✅ Authentication
4. ✅ Farmer dashboard
5. ✅ Produce management
6. ✅ Market price module
7. ✅ Sell vs Store vs Process recommendation engine
8. ✅ Buyer marketplace
9. ✅ Storage finder + processing marketplace
10. ✅ AI agriculture assistant
11. ✅ Analytics
12. ✅ Testing & security pass
13. ✅ Final UI polish
14. ✅ Deployment
15. ✅ Hackathon presentation — this checkpoint

## Hackathon materials

- `presentation/AgriFlow_Presentation.pptx` — 10-slide deck (Problem,
  Solution, How It Works, Recommendation/AI Engine, Architecture,
  Impact, Scalability, Future Scope)
- `presentation/PRESENTATION.md` — 60-second pitch script, a timed
  3-minute live demo walkthrough (10 quintals of tomatoes, per the
  brief), and judge Q&A prep (register/login/JWT)
4. Farmer dashboard
5. Produce management (CRUD)
6. Market price module
7. Sell vs Store vs Process recommendation engine
8. Buyer marketplace
9. Storage finder + processing marketplace
10. AI agriculture assistant (EN/HI)
11. Analytics
12. Testing & security pass
13. UI polish
14. Deployment
15. Hackathon presentation
