# Pozvonimne - Веб-приложение для видеозвонков

Приложение для видеозвонков с авторизацией через Supabase, WebRTC и современным UI на Next.js.

## 🚀 Особенности

- **Аутентификация**: Регистрация и вход через Supabase
- **Видеозвонки**: WebRTC с поддержкой peer-to-peer соединений
- **Профиль пользователя**: Управление профилем и аватарками
- **Проверка уникальности**: Реал-тайм проверка никнеймов
- **Отзывчивый дизайн**: Mobile-first подход с Tailwind CSS
- **Оптимизированная сборка**: Статический экспорт для GitHub Pages

## 🛠 Технологии

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS 4, Lucide React иконки
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **WebRTC**: Simple Peer для P2P соединений
- **State Management**: Zustand
- **Deployment**: GitHub Pages с GitHub Actions

## 📋 Предварительные требования

- Node.js 20+
- npm или yarn
- Аккаунт Supabase
- GitHub репозиторий

## 🏃‍♂️ Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Запуск в режиме разработки

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## 🚢 Деплой на GitHub Pages

### Автоматический деплой (рекомендуется)

1. **Включите GitHub Pages** в настройках репозитория:
   - Перейдите в Settings → Pages
   - Выберите "GitHub Actions" как источник

2. **Push изменений** в ветку `master`:
   ```bash
   git add .
   git commit -m "Add GitHub Pages deployment"
   git push origin master
   ```

3. **Дождитесь завершения** GitHub Actions workflow

Ваше приложение будет доступно по адресу: `https://igorao79.github.io/pozvonimne`

### Ручной деплой

```bash
# Установка gh-pages (если еще не установлено)
npm install --save-dev gh-pages

# Сборка и деплой
npm run deploy
```

## 🔧 Сборка и оптимизация

### Production сборка

```bash
npm run build
```

### Анализ бандла (опционально)

```bash
npm install --save-dev @next/bundle-analyzer
echo "ANALYZE=true" >> .env.local
npm run build
```

## 📁 Структура проекта

```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Главный layout
│   └── page.tsx        # Главная страница
├── components/         # React компоненты
│   ├── Auth/          # Компоненты аутентификации
│   ├── Call/          # Компоненты звонков
│   ├── Profile/       # Компоненты профиля
│   └── UsersList/     # Список пользователей
├── hooks/             # React хуки
├── store/             # Zustand store
└── utils/             # Утилиты (Supabase клиенты)
```

## 🗄 Настройка базы данных

Проект использует Supabase. Запустите SQL скрипты в указанном порядке:

1. `supabase_setup.sql` - основная настройка
2. `check_display_name.sql` - функция проверки уникальности
3. `update_display_name.sql` - обновление display name
4. `update_user_metadata.sql` - обновление метаданных пользователя

## 🎯 Оптимизации

Проект настроен с учетом лучших практик:

- **Static Export**: Полностью статическая генерация для GitHub Pages
- **Image Optimization**: Оптимизация изображений отключена для статического экспорта
- **Console Removal**: Удаление console.log в продакшене
- **Package Optimization**: Оптимизация импортов пакетов
- **Bundle Analysis**: Возможность анализа размера бандла

## 📱 Мобильная адаптация

Приложение полностью адаптивно и оптимизировано для мобильных устройств:

- Mobile-first дизайн
- CSS Grid и Flexbox
- Оптимизированные медиа-запросы
- Touch-friendly интерфейс

## 🔒 Безопасность

- Аутентификация через Supabase
- Защищенные API маршруты
- Валидация данных на клиенте и сервере
- Безопасное хранение секретов

## 🤝 Contributing

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - смотрите файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

Если у вас возникли проблемы или вопросы:

1. Проверьте [Issues](https://github.com/igorao79/pozvonimne/issues) на GitHub
2. Создайте новый issue с подробным описанием проблемы
3. Укажите версию Node.js и npm, которые вы используете

---

**Примечание**: Это приложение использует WebRTC для peer-to-peer видеозвонков. Убедитесь, что ваш браузер поддерживает WebRTC и у вас есть доступ к камере и микрофону.
