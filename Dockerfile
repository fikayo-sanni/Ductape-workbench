FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:4311/
ARG VITE_LOGIN_ENC_KEY=
ARG VITE_APP_ENV=development

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LOGIN_ENC_KEY=$VITE_LOGIN_ENC_KEY
ENV VITE_APP_ENV=$VITE_APP_ENV

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
