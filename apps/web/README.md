# Perkify — Landing Page

Landing page del concepto "Web3 Bounty Board" para Perkify, construida con Next.js 14 (App Router) + TypeScript.

## Estructura

```
app/
  layout.tsx     → fuentes (Space Grotesk, JetBrains Mono, Inter) y metadata
  page.tsx       → toda la landing, dividida en secciones y datos tipados
  globals.css    → sistema de diseño (colores, tipografía, componentes)
```

## Cómo correrlo

```bash
npm install
npm run dev

```








Abre http://localhost:3000

## Build de producción

```bash
npm run build
npm start
```

## Editar contenido

- **Categorías de misión**: array `categories` en `app/page.tsx`.
- **Misiones activas**: array `missions` en `app/page.tsx`.
- **Pasos del flujo**: array `flowSteps` en `app/page.tsx`.
- **Colores y tipografía**: variables `:root` en `app/globals.css`.

