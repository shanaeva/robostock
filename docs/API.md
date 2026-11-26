# API контракт

Пути указаны от корня API (глобального префикса нет; базовый адрес задаётся во фронтенде через `NEXT_PUBLIC_API_BASE_URL`). Тела запросов — JSON. Фронтенд отправляет cookies через `credentials: 'include'`. Все POST требуют CSRF-cookie и заголовка `X-CSRF-Token` (получить через `GET /auth/csrf`).

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

Тело ошибки: `{ statusCode: number; message: string; code?: string }`. Поле `code` —
машинный признак, по которому ветвится клиент; оно присутствует только у 4xx и только
со значениями из списка ниже. У 5xx `code` и исходное сообщение не отдаются.

- `400` — невалидные или лишние поля
- `401` — нет активной сессии
- `403` — неверный CSRF-токен
- `429` — rate limit

Коды:

- `CSRF_REJECTED` (403) — устаревший или несовпадающий CSRF-токен; клиент перезапрашивает
  `GET /auth/csrf` и один раз повторяет запрос
- `RATE_LIMITED` (429) — превышен лимит попыток
- `INVALID_CREDENTIALS` (401) — неверный пароль, несуществующий email или неподтверждённый аккаунт (одинаковый ответ, без разделения)
- `INVALID_CODE` (400) — неверный или истёкший код из письма
- `INVALID_INPUT` (400) — не прошла валидация тела запроса
