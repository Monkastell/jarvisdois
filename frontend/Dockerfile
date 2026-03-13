FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install

COPY . .
RUN npm rebuild
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
