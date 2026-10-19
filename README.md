# TCGlib

Biblioteca de Trading Card Games. El primer juego es One Piece: el catálogo vive en MongoDB y cada usuario guarda, con su cuenta de Google, las cartas que tiene y las que busca.

En local la web escucha en `http://localhost:3000` y la API en `http://localhost:3001`.

## Desarrollo local

Hace falta Docker, Node.js 22 y un fichero `.env` en la raíz (parte de `.env.example`).

```bash
cp .env.example .env
docker compose up -d
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

MongoDB 7 queda en el puerto `27018` del portátil. La primera carga del catálogo es:

```bash
cd backend && npm run sync:one-piece
```

Esa sincronización gasta peticiones de APITCG. No hace falta repetirla en cada arranque.

El acceso con Google usa la URI de redirección `http://localhost:3001/api/auth/google/callback`.

## Producción

El servidor Traefik ya tiene que estar en marcha y la red Docker externa `web` tiene que existir, igual que en el resto de aplicaciones del VPS.

Registros DNS, ambos apuntando a `IP_SERVER`:

- `url_frontend`
- `url_backend`

En Google Cloud, en el cliente OAuth de TCGlib, añade esta URI de redirección autorizada:

`https://url_backend/api/auth/google/callback`

En el servidor, dentro del repositorio:

```bash
cp .env.production.example .env
```

Rellena `MONGO_ROOT_PASSWORD`, `APITCG_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_STATE_SECRET` y `ADMIN_EMAILS`. La contraseña de Mongo solo puede llevar letras y números. `ADMIN_EMAILS` es la lista de correos de Google, separados por comas, que pueden abrir el panel de administración.

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api node dist/sync-one-piece
```

MongoDB no publica ningún puerto. La API y la web solo salen a internet a través de Traefik. El navegador entra por `url_frontend`; el contenedor de Next llama a la API por el nombre interno `http://api:3001`.

Para ver los registros o volver a construir tras un cambio:

```bash
docker compose -f docker-compose.prod.yml logs -f api web
docker compose -f docker-compose.prod.yml up -d --build
```

Los datos de Mongo persisten en el volumen `tcglib_mongo_data`.
