# Plan: Восстановление сайта `kontinent-rm.ru` (без регистрации)

## 1. Цель
Собрать новый сайт, максимально близкий к текущему `kontinent-rm.ru` по структуре и контенту, с возможностью продажи товаров без регистрации пользователей.

## 2. Бизнес-рамки MVP
- Полный каталог товаров и карточки товаров.
- Категории, фильтры, поиск.
- Корзина и оформление заказа как гость.
- Контактные данные, политика, доставка/оплата.
- SEO-структура (ЧПУ, мета-теги, sitemap, robots).
- Панель админа в MVP не делаем (контент управляется через БД + seed/импорт).

## 3. Предлагаемая архитектура (Senior-вариант)

### 3.1 Общая схема
- `frontend` + `backend API` как единое приложение на Next.js (App Router).
- PostgreSQL для хранения каталога и заказов.
- Redis для кэша каталога и rate-limit на формы.
- Объектное хранилище (S3-совместимое) для изображений товаров.
- Nginx/Caddy как reverse proxy + TLS.

### 3.2 Почему так
- Быстрый старт (один стек, меньше интеграционных рисков).
- SSR/ISR для SEO и скорости.
- Удобно масштабировать позже (вынести API в отдельный сервис).
- Подготовка к будущей регистрации без переписывания ядра.

## 4. Технологический стек
- **Frontend/BFF**: Next.js 15, TypeScript, Tailwind CSS, React Server Components.
- **ORM**: Prisma.
- **DB**: PostgreSQL 16.
- **Cache/Queues (опц.)**: Redis.
- **Валидация**: Zod.
- **Логи**: Pino + structured logs.
- **Тесты**: Vitest (unit), Playwright (e2e smoke).
- **CI/CD**: GitHub Actions (lint, test, build).
- **Деплой**: Docker Compose (MVP), затем можно в Kubernetes.

## 5. Модель данных (минимально необходимая)

### 5.1 Каталог
- `Category`: id, slug, name, parentId, sortOrder, isActive.
- `Product`: id, slug, sku, name, description, specs(JSON), price, oldPrice, stockStatus, isActive, brandId.
- `ProductImage`: id, productId, url, alt, sortOrder.
- `ProductCategory`: productId, categoryId.
- `Brand`: id, name, slug.

### 5.2 Продажи без регистрации
- `Order`: id, number, status, customerName, phone, email, comment, deliveryType, paymentType, total, createdAt.
- `OrderItem`: id, orderId, productId, sku, qty, priceAtPurchase, titleAtPurchase.
- `OrderEvent`: id, orderId, status, note, createdAt.

### 5.3 Контентные страницы
- `Page`: id, slug, title, contentHtml/contentMd, seoTitle, seoDescription, isPublished.

## 6. Функциональная архитектура

### 6.1 Публичная витрина
- Главная.
- Категории.
- Каталог/листинг.
- Карточка товара.
- Корзина.
- Checkout guest-only (без аккаунта).
- Статические страницы (доставка, оплата, контакты).

### 6.2 API-слой
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/orders`
- `POST /api/lead` (форма обратной связи)

### 6.3 Безопасность
- Rate limit на order/lead endpoints.
- Серверная валидация всех входных данных.
- Базовая антибот-защита (honeypot + time check + optional captcha).
- Санитизация HTML-контента.

## 7. План реализации (этапы)

### Этап 0: Аналитика и фиксация эталона
- Скан текущего сайта: страницы, категории, товары, изображения, мета.
- Карта URL и приоритеты по SEO.
- Экспорт контента в нормализованный формат (JSON/CSV).

### Этап 1: Каркас проекта
- Инициализация Next.js + Prisma + PostgreSQL.
- Базовые layout-компоненты, навигация, footer, SEO-базис.
- Docker Compose для локального и прод-сборки.

### Этап 2: Импорт каталога
- Скрипт импорта категорий/товаров/изображений.
- Проверка дублей SKU/slug.
- Валидация полноты данных.

### Этап 3: Витрина
- Листинги, фильтры, карточка товара.
- Корзина (localStorage + server price recheck).
- Checkout без регистрации.

### Этап 4: Заказы и уведомления
- Сохранение заказа в БД.
- Email/Telegram уведомления менеджеру.
- Статусная модель заказа.

### Этап 5: SEO и производительность
- Sitemap, robots, canonical.
- OpenGraph/Schema.org Product.
- Оптимизация изображений, lazy-loading, ISR.

### Этап 6: Тестирование и релиз
- Smoke e2e для критических сценариев.
- Нагрузочный sanity-check на каталог/checkout.
- Выпуск v1.

## 8. Нефункциональные требования
- Время ответа каталога < 300ms (cached).
- Lighthouse mobile >= 80 на ключевых страницах.
- Zero critical vulnerabilities по `npm audit`/SCA перед релизом.
- Логирование заказов и ошибок с trace-id.

## 9. Риски и как закрываем
- Риск: неполные данные при переносе.
  - Мера: ETL-скрипт + отчёт расхождений + ручная валидация топ-товаров.
- Риск: просадка SEO после запуска.
  - Мера: URL parity, 301 redirects, sitemap, мониторинг индексации.
- Риск: спам через формы заказа.
  - Мера: rate limit + honeypot + server validation.

## 10. Что будет в v2
- Регистрация/личный кабинет.
- История заказов.
- Онлайн-оплата.
- Админ-панель управления товарами и ценами.

## 11. Definition of Done для MVP
- Каталог и карточки перенесены и визуально сопоставимы с оригиналом.
- Работает корзина и оформление заказа без регистрации.
- Данные заказа попадают в БД и менеджер получает уведомление.
- SEO-база и редиректы настроены.
- Проект разворачивается одной командой через Docker Compose.
