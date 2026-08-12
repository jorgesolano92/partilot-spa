# Partilot Web App

SPA Vue 3 (Vite + TypeScript + Pinia + Vue Router) para acceso como **usuario**, **vendedor** y **gestor**.

Consume la API del backend Laravel (`H:\xampp3\htdocs\sipart`), mismo auth que la app Ionic:

- `POST /api/auth/login-usuario`
- Header `Authorization: Bearer {token}`

El panel Blade de administración es otra superficie (superadmin / administración / entidad / gestor responsable).

## Desarrollo

```bash
cd H:\Users\Jorge\proyectos\partilot-webapp
cp .env.example .env   # ajusta VITE_API_URL
npm install
npm run dev
```

Abre `http://localhost:5173`.

Ejemplo XAMPP: `VITE_API_URL=http://localhost/sipart/public/api`

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build producción
- `npm run preview` — preview del build
