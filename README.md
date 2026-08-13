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

Asegúrate de tener la API Laravel en marcha, por ejemplo:

```bash
cd H:\xampp3\htdocs\sipart
php artisan serve
```

Por defecto `VITE_API_URL=http://localhost:8000/api`.

Si usas XAMPP y la URL `/sipart/public/api` no responde (404), sigue con `artisan serve` o configura el virtual host al `public/` del proyecto.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build producción
- `npm run preview` — preview del build
