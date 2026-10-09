# Field Check GT
App que chequea si está lloviendo actualmente y cuanto tiempo ha llovido en los distintos campos de softball / baseball de Guatemala

## Campos y fuentes de datos

| Campo | Fuentes (en orden) |
|---|---|
| Campo Marte (Zona 5) | PWS [IGUATE37](https://www.wunderground.com/dashboard/pws/IGUATE37) → Open-Meteo |
| Las Charcas (Zona 11) | PWS [IGUATE56](https://www.wunderground.com/dashboard/pws/IGUATE56) → PWS [IGUATE57](https://www.wunderground.com/dashboard/pws/IGUATE57) → Open-Meteo |

Las ubicaciones se configuran en `src/config/locations.ts`.

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # pruebas unitarias (Vitest)
npm run lint
```

Stack: Next.js (App Router) + TypeScript + Tailwind CSS, desplegado en Vercel.
