# robostock

Платформа управления складом с симуляцией роботов

## Требования

- Node.js 24, pnpm 12
- Docker (для базы данных и почтового сервиса)

## Установка

```bash
pnpm install
```

## Запуск

```bash
# Запустить всё (Docker + бэкенд + фронтенд)
pnpm start

# Остановить всё
pnpm end
```

Или запускать сервисы по отдельности:

```bash
# Из корня репозитория — только Docker-сервисы
cd backend && pnpm dc

# Из backend/
pnpm be   # дев-сервер бэкенда
pnpm dc   # запустить Docker-сервисы (PostgreSQL, Mailpit)
pnpm dc:d # остановить Docker-сервисы

# Из frontend/
pnpm fe   # дев-сервер фронтенда
```

Бэкенд: http://localhost:3001, фронтенд: http://localhost:3000.  
Mailpit (просмотр писем): http://localhost:8025.
