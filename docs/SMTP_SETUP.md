# Настройка SMTP для Supabase

## Проблема
Supabase предоставляет встроенный email-сервис только для разработки. Для production-приложений требуется настройка собственного SMTP-сервера.

## Рекомендуемые SMTP-провайдеры

### 1. **Resend** (Рекомендуется - самый простой)
- **Сайт**: https://resend.com
- **Бесплатный тариф**: 3,000 email/месяц
- **Настройка**: Через API ключи
- **Преимущества**: Современный API, отличная deliverability

### 2. **SendGrid**
- **Сайт**: https://sendgrid.com
- **Бесплатный тариф**: 100 email/день
- **Преимущества**: Надежный, масштабируемый

### 3. **Mailgun**
- **Сайт**: https://mailgun.com
- **Бесплатный тариф**: 5,000 email/месяц
- **Преимущества**: Хорошая deliverability, подробная аналитика

### 4. **AWS SES** (Для AWS пользователей)
- **Сайт**: https://aws.amazon.com/ses/
- **Цена**: Первые 62,000 email бесплатные
- **Преимущества**: Масштабируемость, интеграция с AWS

## Настройка Resend (Рекомендуемый вариант)

### Шаг 1: Регистрация в Resend
1. Перейдите на https://resend.com
2. Зарегистрируйтесь (используйте GitHub аккаунт для быстрой регистрации)
3. Подтвердите email

### Шаг 2: Создание API ключа
1. В dashboard перейдите в **API Keys**
2. Нажмите **Create API Key**
3. Назовите ключ (например, `supabase-production`)
4. Скопируйте сгенерированный API ключ

### Шаг 3: Настройка домена (Опционально, но рекомендуется)
1. В **Domains** нажмите **Add Domain**
2. Введите ваш домен (например, `pozvonimne.vercel.app`)
3. Следуйте инструкциям по настройке DNS записей

### Шаг 4: Настройка в Supabase

#### Вариант A: Через Supabase Dashboard
1. Перейдите в ваш проект Supabase
2. Откройте **Settings → Edge Functions**
3. В разделе **Environment Variables** добавьте:
```
RESEND_API_KEY=ваш_api_ключ_resend
```
4. Или настройте SMTP переменные:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=ваш_api_ключ_resend
SMTP_SENDER_NAME=Позвони.мне
SMTP_ADMIN_EMAIL=noreply@ваш_домен.com
```

#### Вариант B: Через Supabase CLI
```bash
# Установите Supabase CLI, если не установлен
npm install -g supabase

# Залогиньтесь
supabase login

# Перейдите в папку проекта
cd ваш_проект

# Установите переменные окружения
supabase secrets set RESEND_API_KEY=ваш_api_ключ_resend
supabase secrets set SMTP_HOST=smtp.resend.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=resend
supabase secrets set SMTP_PASS=ваш_api_ключ_resend
```

## Настройка других провайдеров

### SendGrid SMTP настройки:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=ваш_sendgrid_api_key
```

### Mailgun SMTP настройки:
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@ваш_домен.mailgun.org
SMTP_PASS=ваш_mailgun_password
```

### AWS SES SMTP настройки:
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=ваш_ses_username
SMTP_PASS=ваш_ses_password
```

## Проверка настройки

### Тест отправки email
```javascript
// В браузерной консоли вашего приложения
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('ваш_supabase_url', 'ваш_anon_key')

const { data, error } = await supabase.auth.signInWithOtp({
  email: 'test@example.com',
  options: {
    shouldCreateUser: false
  }
})

console.log('Результат:', { data, error })
```

### Проверка логов
1. В Supabase Dashboard откройте **Logs → Auth**
2. Попробуйте отправить тестовый email
3. Проверьте логи на ошибки

## Дополнительные настройки

### SPF запись (рекомендуется)
Добавьте в DNS вашего домена:
```
v=spf1 include:_spf.google.com ~all
```
Или для Resend:
```
v=spf1 include:relay.mailchannels.net ~all
```

### DKIM настройка
Большинство SMTP-провайдеров автоматически настраивают DKIM. Проверьте в их dashboard.

### DMARC политика
```
v=DMARC1; p=none; rua=mailto:dmarc@ваш_домен.com
```

## Troubleshooting

### Email не приходят
1. Проверьте **Spam/Junk** папку
2. Проверьте правильность SMTP настроек
3. Проверьте логи Supabase на ошибки
4. Убедитесь, что домен верифицирован

### Ошибка аутентификации
1. Проверьте правильность API ключа
2. Убедитесь, что ключ активен
3. Проверьте ограничения аккаунта провайдера

### Rate limits
- **Resend**: 10 emails/секунд, 100 emails/час для новых аккаунтов
- **SendGrid**: Зависит от тарифа
- **Mailgun**: 300 emails/час для бесплатного тарифа

## Важные замечания

1. **Безопасность**: Никогда не коммитите API ключи в git
2. **Мониторинг**: Регулярно проверяйте deliverability в dashboard провайдера
3. **Резерв**: Рассмотрите несколько SMTP-провайдеров для redundancy
4. **Тестирование**: Всегда тестируйте email перед запуском в продакшен

## Переход с встроенного сервиса

После настройки SMTP:
1. Все новые email будут отправляться через ваш SMTP-сервер
2. Существующие email-шаблоны продолжат работать
3. Увеличится deliverability и надежность доставки
