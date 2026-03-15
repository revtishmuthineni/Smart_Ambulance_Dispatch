# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Backend setup

1. Copy `backend/.env.example` to `backend/.env` and set your MapMyIndia credentials. You can provide either:

- `MAPMYINDIA_API_KEY` (preferred) or
- `MAPMYINDIA_CLIENT_ID` and `MAPMYINDIA_CLIENT_SECRET` (token flow)

2. Optional: to force a mock route for frontend preview set `FORCE_MOCK_ROUTE=true` when starting the backend.

Start backend:

```powershell
cd backend
npm install
npm start
```

Start frontend:

```powershell
cd frontend
npm install
npm run dev
```

Run smoke test (from project root):

```powershell
npm run smoke-test
```

Notes:
- The backend will prefer the 3rd alternative route returned by MapMyIndia when available to avoid selecting excessively long routes.
- Use `FORCE_MOCK_ROUTE=true` to always return a small mock polyline for demos.

## Docker (local preview / deploy)

You can run the app with Docker Compose (builds backend and frontend images):

1. Create a `.env` file in `my-react-app` or export the MapMyIndia envs in your shell:

```
MAPMYINDIA_API_KEY=your_key_here
# or
MAPMYINDIA_CLIENT_ID=your_client_id
MAPMYINDIA_CLIENT_SECRET=your_client_secret
```

2. Build and start services:

```powershell
cd my-react-app
docker-compose up --build
```

- Backend will be available at `http://localhost:5000`.
- Frontend will be available at `http://localhost:5173` (served by nginx in the container).

3. To run in mock-preview mode set `FORCE_MOCK_ROUTE=true` in the environment before `docker-compose up`.


