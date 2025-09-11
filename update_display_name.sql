-- ОТДЕЛЬНЫЙ SQL СКРИПТ ДЛЯ ОБНОВЛЕНИЯ DISPLAY_NAME
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта
-- Этот скрипт добавляет функцию для обновления display_name пользователя

-- ШАГ 1: Создаем функцию update_display_name
CREATE OR REPLACE FUNCTION update_display_name(new_display_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_profile RECORD;
BEGIN
  -- Проверяем что display_name не пустой
  IF new_display_name IS NULL OR trim(new_display_name) = '' THEN
    RETURN FALSE;
  END IF;

  -- Получаем текущий профиль
  SELECT * INTO current_profile
  FROM public.user_profiles
  WHERE id = auth.uid();

  -- Если профиля нет, создаем его сначала
  IF current_profile IS NULL THEN
    PERFORM initialize_user_profile();
  END IF;

  -- Обновляем display_name
  UPDATE public.user_profiles
  SET display_name = trim(new_display_name), updated_at = NOW()
  WHERE id = auth.uid();

  RETURN TRUE;
END;
$$;

-- ШАГ 2: Проверяем что функция создана
SELECT 'Функция update_display_name создана успешно!' AS result;

-- ШАГ 3: Тестируем функцию (замените 'Новое имя' на желаемое отображаемое имя)
-- SELECT update_display_name('Новое имя') AS display_name_updated;

-- ИНСТРУКЦИЯ:
-- 1. Выполните этот скрипт в SQL Editor Supabase
-- 2. Функция update_display_name обновляет отображаемое имя пользователя
-- 3. Функция автоматически создает профиль, если его нет
-- 4. Возвращает TRUE при успешном обновлении

-- ЗАВИСИМОСТИ:
-- Эта функция зависит от функции initialize_user_profile(), которая должна быть создана
