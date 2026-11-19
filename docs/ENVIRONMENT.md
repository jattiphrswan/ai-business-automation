# Environment Variables
## Backend
`PORT=4000` — API listen port.
`FRONTEND_ORIGIN=http://localhost:5173` — CORS allowlist origin.
`DATA_FILE=./src/data/store.json` — MVP local data file, relative to backend working directory.
## Frontend
`VITE_API_URL=http://localhost:4000` — API origin (public frontend configuration).
## Future server-only secrets (not implemented)
`DATABASE_URL`, `REDIS_URL`, `AI_PROVIDER_API_KEY`, `CRM_API_KEY`, `EMAIL_PROVIDER_TOKEN`, `WEBHOOK_SIGNING_SECRET`, `OIDC_CLIENT_SECRET`.
Never place secrets in `VITE_*` variables. Do not commit `.env` files.
