# Vasiliy_business

Статический сайт каталога товаров с корзиной и оформлением заказа без регистрации.

## Локальный запуск

```powershell
python -m http.server 8080
```

Открыть: `http://localhost:8080`

## Мобильное превью

```powershell
npm run preview:device
```

Открыть: `http://localhost:4177`

## Деплой

Деплой на GitHub Pages выполняется автоматически через workflow `.github/workflows/deploy-pages.yml` при пуше в ветку `main`.
