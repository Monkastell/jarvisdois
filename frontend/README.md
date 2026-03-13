cd frontend
docker build -t seuuser/meuapp-frontend .
docker run -p 80:80 seuuser/meuapp-frontend