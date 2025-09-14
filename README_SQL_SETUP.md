# Настройка базы данных Supabase для приложения "Позвони.мне"

## 📋 Порядок выполнения SQL скриптов

### 1. **Основная настройка** (выполните первым)
**Файл:** `create_user_profiles.sql`
- Создает таблицу `user_profiles`
- Настраивает индексы и политики безопасности
- Создает bucket для аватарок
- **Время выполнения:** ~5 секунд

### 2. **Триггер создания профилей** (выполните вторым)
**Файл:** `create_profile_trigger.sql`
- Создает функцию автоматического создания профилей
- Триггер **ОТКЛЮЧЕН** для предотвращения ошибок
- **Время выполнения:** ~2 секунды

### 3. **Функции работы с профилями** (выполните третьим)
**Файл:** `update_profile_functions.sql`
- Создает все основные функции для работы с профилями
- Настраивает права доступа
- **Время выполнения:** ~10 секунд

### 4. **Обновление функций** (выполните по необходимости)
**Файл:** `update_username.sql`
- Обновляет функцию `update_username()`
- **Когда использовать:** При изменениях в логике обновления username

**Файл:** `update_display_name.sql`
- Добавляет функцию `update_display_name()`
- **Когда использовать:** При необходимости обновления отображаемого имени

## 🚀 Быстрый старт

### Для новой базы данных:
```bash
1. create_user_profiles.sql
2. create_profile_trigger.sql
3. update_profile_functions.sql
```

### Для обновления существующей базы:
```bash
1. update_profile_functions.sql (обновит все функции)
2. update_username.sql (если нужно обновить username)
3. update_display_name.sql (если нужно добавить display_name)
```

## 📊 Структура базы данных

### Таблица `user_profiles`
```sql
id              UUID PRIMARY KEY (ссылка на auth.users)
username        TEXT UNIQUE (3-20 символов, буквы/цифры/_)
display_name    TEXT (отображаемое имя)
avatar_url      TEXT (ссылка на аватарку)
status          TEXT (online/offline)
last_seen       TIMESTAMPTZ (последняя активность)
created_at      TIMESTAMPTZ (создание профиля)
updated_at      TIMESTAMPTZ (последнее обновление)
```

### Основные функции

#### `get_users_with_profiles()`
Возвращает список пользователей с их профилями для звонков.

#### `update_username(new_username TEXT)`
Обновляет username пользователя с проверкой уникальности.

#### `update_display_name(new_display_name TEXT)`
Обновляет отображаемое имя пользователя.

#### `ensure_user_profile()`
Создает полный профиль пользователя при первом использовании.

#### `initialize_user_profile()`
Создает базовый профиль без username.

#### `update_user_last_seen()`
Обновляет статус и время последней активности.

## 🔧 Ручное тестирование

### Проверка функций в SQL Editor:
```sql
-- Проверяем количество профилей
SELECT COUNT(*) FROM user_profiles;

-- Тестируем получение пользователей
SELECT username, display_name, status FROM get_users_with_profiles() LIMIT 5;

-- Тестируем обновление username
SELECT update_username('testuser123');
```

### Проверка прав доступа:
```sql
-- Проверяем политики RLS
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'user_profiles';
```

## ⚠️ Важные замечания

### 1. **Триггер отключен намеренно**
Триггер автоматического создания профилей отключен, чтобы предотвратить ошибки 500 при регистрации. Профили создаются через функции `ensure_user_profile()` и `initialize_user_profile()`.

### 2. **Username может быть NULL**
Поле `username` nullable, чтобы можно было создавать профили постепенно. Пользователи с `username = NULL` не отображаются в списке для звонков.

### 3. **Автоматическая генерация username**
При создании профиля через `ensure_user_profile()` username генерируется автоматически из `display_name` или email.

### 4. **Безопасность**
- Включена Row Level Security (RLS)
- Пользователи могут читать все профили, но обновлять только свой
- Функции выполняются с правами владельца (SECURITY DEFINER)

## 🐛 Устранение неполадок

### Ошибка "already exists"
```sql
-- Удалите конфликтующие объекты
DROP FUNCTION IF EXISTS function_name();
DROP POLICY IF EXISTS policy_name ON table_name;
```

### Ошибка "violates foreign key constraint"
```sql
-- Проверьте что пользователь существует в auth.users
SELECT id, email FROM auth.users WHERE email_confirmed_at IS NOT NULL;
```

### Функции не работают
```sql
-- Пересоздайте функции
-- Выполните update_profile_functions.sql
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи Supabase
2. Убедитесь в правильном порядке выполнения скриптов
3. Проверьте права доступа аутентифицированного пользователя

---

**Последнее обновление:** $(date)
**Версия:** 1.0.0

