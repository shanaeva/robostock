## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

From the repository root, install dependencies:

```bash
pnpm install --frozen-lockfile
```

### Environment

Create `frontend/.env.local` from the example:

```bash
cp -n frontend/.env.example frontend/.env.local
```

`NEXT_PUBLIC_API_BASE_URL` must point at the backend (port 3001 by default,
see `backend/.env.example`). The frontend dev server itself runs on port 3000.

### Development

From the repository root:

```bash
pnpm --filter frontend dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

The page automatically updates as you edit files in `src/`.

## Frontend checks

Run the frontend tests from the repository root (the same command CI runs):

```bash
pnpm --filter frontend test
```

`vitest.config.mjs` resolves the same `@/` alias as TypeScript. The warehouse
screen's structure and data modes are described in
[`src/_pages/warehouses/README.md`](src/_pages/warehouses/README.md).

## Структура проекта

Используем Next.js App Router и Feature-Sliced Design (FSD):

```text
src/
├── app/                 # Маршруты Next.js, layout и инициализация
│   ├── layout.tsx
│   ├── page.tsx         # Маршрут /, подключает HomePage
│   ├── warehouses/page.tsx
│   └── styles/          # Глобальные стили
├── _pages/              # Сборка страниц
│   ├── home/            # Стартовый экран
│   └── warehouses/      # Страница складов
├── widgets/             # Крупные блоки интерфейса
│   └── warehouse-management/
├── features/            # Пользовательские действия
│   └── manage-warehouse/
├── entities/            # Предметные данные, схемы и запросы
│   └── warehouse/
└── shared/              # Общие UI-компоненты, утилиты и HTTP-транспорт
```

`app` содержит файлы маршрутизации Next.js. Содержимое экранов находится в
`_pages`: префикс предотвращает конфликт с Pages Router. Маршрут подключает
экран через публичный API, например:

```tsx
export { HomePage as default } from '@/_pages/home';
```

В `app` остаются маршруты, metadata, разбор route params и searchParams,
layout и инициализация приложения. UI и предметную логику размещаем в FSD-слоях.
В `app` также могут появиться `providers` и типы уровня приложения в `types`.
Предметные типы храним рядом с соответствующей логикой. Отдельный `_app`
и пустые папки заранее не создаём.

Внутри среза используем сегменты по назначению: `ui` для компонентов, `model`
для состояния и правил, `api` для запросов и адаптеров. Создаём только нужные
сегменты. Срез экспортирует доступные извне компоненты, функции и типы через
корневой `index.ts`; между срезами импортируем из этого публичного API,
например `@/entities/warehouse`, без обращения к внутренним файлам.

Направление зависимостей: `_pages` → `widgets` → `features` → `entities` →
`shared`. Можно пропускать промежуточные слои, но нельзя импортировать верхний
слой из нижнего или один срез из другого на том же слое. Внутри среза используем
относительные импорты. В `shared` размещаем общий код без логики конкретного
предметного сценария.

## Проверки

Из корня workspace:

```bash
pnpm --filter frontend fsd:check
pnpm --filter frontend lint
pnpm --filter frontend exec next typegen
pnpm --filter frontend exec tsc --noEmit --incremental false
pnpm --filter frontend build
```

Steiger проверяет архитектуру FSD с рекомендуемыми правилами, включая ограничения
импортов и публичные API. FSD-проверка также выполняется перед коммитом и в CI.

В версии плагина 0.8.2 правило `fsd/typo-in-layer-name` ошибочно считает `_pages`
опечаткой. Оно отключено только для `src/_pages/**`; остальные правила для этого
слоя остаются включёнными.

`fsd/insignificant-slice` работает как предупреждение: у тонкой страницы может
быть единственный виджет, а у виджета — единственная feature. Это не блокирует
коммит; ограничения импортов и публичных API остаются ошибками. Steiger не
проверяет, насколько тонким остался маршрут Next.js: это проверяем на ревью.
