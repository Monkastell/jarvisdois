# frontend/Dockerfile
# Estágio 1: Build da aplicação React
FROM node:18-alpine AS build

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm ci

# Copia o código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Estágio 2: Servir com nginx
FROM nginx:alpine

# Copia os arquivos buildados do estágio anterior
COPY --from=build /app/build /usr/share/nginx/html

# Copia configuração customizada do nginx (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]