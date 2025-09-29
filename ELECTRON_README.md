# Электронное приложение "Позвони.мне"

Это десктопное приложение на базе Electron, которое включает весь функционал веб-версии "Позвони.мне" - голосовые звонки, чат, аутентификация и админ-панель.

## Возможности

- ✅ Полноценное Next.js приложение в Electron
- ✅ Голосовые звонки через WebRTC
- ✅ Система чатов с real-time обновлениями
- ✅ Аутентификация пользователей
- ✅ Административная панель
- ✅ Адаптивный дизайн
- ✅ Кросс-платформенная поддержка (Windows, macOS, Linux)

## Установка и запуск

### Предварительные требования

- Node.js 18+
- npm или yarn

### Разработка

1. **Установка зависимостей:**
   ```bash
   npm install
   ```

2. **Запуск в режиме разработки:**
   ```bash
   # Запуск Next.js сервера
   npm run dev

   # В другом терминале запуск Electron
   npm run electron:dev
   ```

3. **Сборка для продакшена:**
   ```bash
   npm run build:electron
   ```

### Production сборка

1. **Полная сборка:**
   ```bash
   npm run build:electron:prod
   ```

2. **Создание дистрибутивов:**
   ```bash
   npm run electron:dist
   ```

## Структура файлов

```
electron/
├── main.js              # Основной процесс Electron
├── preload.js           # Preload скрипт для безопасного API
├── server.js            # Сервер для development режима
├── webrtc-fix.js        # Фиксы для WebRTC в Electron
├── entitlements.plist   # Права для macOS
└── scripts/
    ├── notarize.js      # Нотаризация для macOS
    └── after-build.js   # Пост-обработка сборки

electron-builder.json    # Конфигурация electron-builder
```

## WebRTC поддержка

Приложение включает специальные фиксы для корректной работы WebRTC в Electron:

- Автоматическое определение сетевых интерфейсов
- Настройка аппаратного ускорения
- Обработка нативных модулей

## Сборка для разных платформ

### Windows
```bash
npm run build:electron
```

### macOS
```bash
npm run build:electron
```

### Linux
```bash
npm run build:electron
```

## Переменные окружения

Для корректной работы приложения убедитесь, что у вас настроены переменные окружения Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Отладка

Для отладки Electron приложения:

1. **Development режим:**
   ```bash
   npm run electron:dev
   ```

2. **С проверкой сборки:**
   ```bash
   DEBUG=electron-builder npm run build:electron
   ```

3. **Логи:**
   - Откройте DevTools в приложении (Ctrl+Shift+I)
   - Проверьте консоль за ошибками WebRTC или Electron API

## Известные особенности

- WebRTC в Electron требует специальной настройки
- Нативные модули автоматически пересобираются при сборке
- Для macOS требуется нотаризация (опционально)
- Статический экспорт Next.js для лучшей производительности

## Устранение проблем

### WebRTC не работает
1. Проверьте сетевые настройки
2. Убедитесь, что firewall не блокирует соединения
3. Попробуйте перезапустить приложение

### Сборка не удалась
1. Убедитесь, что Node.js версии 18+
2. Очистите node_modules и переустановите
3. Проверьте переменные окружения

### Черный экран при запуске
1. Попробуйте отключить аппаратное ускорение
2. Проверьте настройки безопасности

## Дополнительная информация

Для более детальной информации о настройке и кастомизации смотрите:

- [Electron Documentation](https://www.electronjs.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Примечание:** Это приложение создано с использованием современных технологий и лучших практик для обеспечения безопасности и производительности.
