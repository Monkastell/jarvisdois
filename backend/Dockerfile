# backend/Dockerfile
FROM python:3.11-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas o requirements primeiro (para cache de camadas)
COPY backend/requirements.txt /app/requirements.txt

# Instala as dependências
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copia o resto do código
COPY backend /app

# Expõe a porta que o Uvicorn vai usar
EXPOSE 8000

# Comando para rodar a aplicação com Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]