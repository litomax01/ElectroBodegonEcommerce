# Imagen de producción de Electro Bodegón (Angular SSR sobre Node).
# Sirve en cualquier plataforma de contenedores (Render, Railway, Fly.io, Cloud Run, VPS...).
#
# Los valores públicos se hornean en el build, así que se pasan como argumentos:
#   docker build \
#     --build-arg SUPABASE_URL=https://xxxx.supabase.co \
#     --build-arg SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
#     --build-arg SITE_URL=https://tu-dominio.com \
#     -t electro-bodegon .
#   docker run -p 4000:4000 -e NG_ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com electro-bodegon
#
# NUNCA pases aquí una clave secreta (service_role / sb_secret_): el build falla si la detecta.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
# `postinstall` genera la configuración con las variables que haya (aún sin valores reales)
RUN npm ci
COPY . .
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ARG SITE_URL
ARG GA4_MEASUREMENT_ID
ARG META_PIXEL_ID
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY \
    SITE_URL=$SITE_URL \
    GA4_MEASUREMENT_ID=$GA4_MEASUREMENT_ID \
    META_PIXEL_ID=$META_PIXEL_ID
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
# El servidor compilado ya incluye sus dependencias (bundle); solo se necesitan los artefactos
COPY --from=build /app/dist/ElectroBodegon ./dist/ElectroBodegon
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 4000
CMD ["node", "dist/ElectroBodegon/server/server.mjs"]
