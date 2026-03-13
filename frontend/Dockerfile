# frontend/Dockerfile
# Estágio 1: Build da aplicação React com Vite
FROM node:18-alpine AS build

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm ci

# Copia o código fonte
COPY . .

# Build da aplicação (Vite gera pasta dist)
RUN npm run build

# Estágio 2: Servir com nginx
FROM nginx:alpine

# Copia os arquivos buildados do estágio anterior (do Vite: /app/dist)
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
