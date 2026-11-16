# API контракт

Общий префикс `/api`. Тела запросов — JSON. Фронтенд отправляет cookies через `credentials: 'include'`. Все POST требуют CSRF-cookie и заголовка `X-CSRF-Token` (получить через `GET /auth/csrf`).

## Эндпоинты

| Метод и путь                     | Тело                              | Ответ                                          |
| -------------------------------- | --------------------------------- | ---------------------------------------------- |
| GET `/health`                    | —                                 | `{ status, database }`                         |
| GET `/auth/csrf`                 | —                                 | `{ csrfToken }` + устанавливает CSRF-cookie    |
| GET `/auth/settings`             | —                                 | `{ emailEnabled: boolean }`                    |
| POST `/auth/register`            | `{ name, email }`                 | 202, сообщение о принятии                      |
| POST `/auth/verify-email`        | `{ email, code, password }`       | 200, устанавливает пароль и подтверждает email |
| POST `/auth/resend-verification` | `{ email }`                       | 202, сообщение о принятии                      |
| POST `/auth/login`               | `{ email, password, rememberMe }` | 200, `{ user }` + HttpOnly cookies             |
| GET `/auth/me`                   | —                                 | 200, `{ user }` / 401 без сессии               |
| POST `/auth/refresh`             | —                                 | 200, `{ user }` + новая пара cookies           |
| POST `/auth/logout`              | —                                 | 200, отзывает текущую сессию                   |
| POST `/auth/logout-all`          | —                                 | 200, отзывает все сессии (требует auth)        |
| POST `/auth/forgot-password`     | `{ email }`                       | 202, сообщение о принятии                      |
| POST `/auth/reset-password`      | `{ email, code, newPassword }`    | 200, меняет пароль и отзывает все сессии       |

## Публичная модель пользователя

```ts
{
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  emailVerified: boolean;
  createdAt: string;
}
```

## Ошибки

- `400` — невалидные или лишние поля
- `401` — нет активной сессии
- `403` — неверный CSRF-токен
- `429` — rate limit
- `INVALID_CREDENTIALS` — неверный пароль, несуществующий email или неподтверждённый аккаунт (одинаковый ответ, без разделения)

## Переменные окружения

`AUTH_EMAIL_ENABLED` (default: `true`) — при `false` регистрация принимает пароль сразу, без шага подтверждения email.
