# Meu Projeto React + Python

## 🚀 Sobre o Projeto

Este projeto consiste em:
- **Backend**: API Python com FastAPI e Uvicorn
- **Frontend**: Aplicação React

## 🐳 Docker

### Backend
```bash
cd backend
docker build -t seuuser/meuapp-backend .
docker run -p 8000:8000 seuuser/meuapp-backend