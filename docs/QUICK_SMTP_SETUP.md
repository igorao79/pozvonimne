# Быстрая настройка SMTP с Resend

## ⚡ Экспресс-настройка (5 минут)

### 1. Регистрация в Resend
```bash
# Перейдите на https://resend.com
# Зарегистрируйтесь через GitHub (самый быстрый способ)
```

### 2. Получение API ключа
1. **Dashboard → API Keys → Create API Key**
2. **Название**: `supabase-production`
3. **Скопируйте** сгенерированный ключ

### 3. Настройка в Supabase
```bash
# Установите переменные окружения в Supabase Dashboard
# Settings → Edge Functions → Environment Variables

RESEND_API_KEY=re_ваш_ключ_здесь
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_ваш_ключ_здесь
SMTP_SENDER_NAME=Позвони.мне
SMTP_ADMIN_EMAIL=noreply@pozvonimne.vercel.app
```

### 4. Тест отправки
```javascript
// В браузере вашего приложения откройте консоль
const { createClient } = await import('https://esm.sh/@supabase/supabase-js')

const supabase = createClient('ваш_supabase_url', 'ваш_anon_key')

await supabase.auth.signInWithOtp({
  email: 'test@ваш_домен.com'
})
```

### 5. Проверка
- Проверьте email в папке **Входящие** и **Спам**
- Если не приходит - проверьте логи Supabase в **Logs → Auth**

## 🎯 Результат
- ✅ Нет ограничений на количество email
- ✅ Высокая deliverability
- ✅ Профессиональные email
- ✅ Масштабируемость

## 📞 Поддержка
Если возникнут проблемы:
1. Проверьте правильность API ключа
2. Убедитесь, что переменные сохранены в Supabase
3. Проверьте логи на ошибки аутентификации
