-- ОТДЕЛЬНЫЙ SQL СКРИПТ ДЛЯ ПРОВЕРКИ УНИКАЛЬНОСТИ DISPLAY_NAME
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта

-- ШАГ 1: Создаем функцию для проверки уникальности display_name
CREATE OR REPLACE FUNCTION is_display_name_available(check_display_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем формат
  IF check_display_name IS NULL OR length(trim(check_display_name)) < 3 OR length(trim(check_display_name)) > 20 THEN
    RETURN FALSE;
  END IF;

  -- Проверяем что содержит только допустимые символы
  IF NOT trim(check_display_name) ~ '^[a-zA-Z0-9_]+$' THEN
    RETURN FALSE;
  END IF;

  -- Проверяем уникальность среди всех пользователей
  RETURN NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE display_name = trim(check_display_name)
  );
END;
$$;

-- ШАГ 2: Создаем функцию для генерации уникального display_name
CREATE OR REPLACE FUNCTION generate_unique_display_name(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  final_name TEXT;
  counter INTEGER := 0;
BEGIN
  -- Начинаем с базового имени
  final_name := trim(base_name);

  -- Если имя уже уникально, возвращаем его
  IF is_display_name_available(final_name) THEN
    RETURN final_name;
  END IF;

  -- Иначе добавляем номер до тех пор, пока не станет уникальным
  WHILE NOT is_display_name_available(final_name || counter::text) LOOP
    counter := counter + 1;
    -- Защита от бесконечного цикла
    IF counter > 1000 THEN
      RETURN final_name || '_' || floor(random() * 10000)::text;
    END IF;
  END LOOP;

  RETURN final_name || counter::text;
END;
$$;

-- ШАГ 3: Проверяем что функции созданы
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('is_display_name_available', 'generate_unique_display_name')
ORDER BY proname;

-- ШАГ 4: Тестируем функции (замените 'testname' на желаемое имя)
-- SELECT is_display_name_available('testname') AS is_available;
-- SELECT generate_unique_display_name('testname') AS unique_name;

-- ШАГ 5: Добавляем права доступа
GRANT EXECUTE ON FUNCTION is_display_name_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_display_name(TEXT) TO authenticated;

-- ШАГ 6: Проверяем создание функций
SELECT 'Функции проверки display_name созданы успешно!' AS result;

-- ИНСТРУКЦИЯ:
-- 1. Выполните этот скрипт в SQL Editor Supabase
-- 2. Функции is_display_name_available() проверяет уникальность имени
-- 3. Функция generate_unique_display_name() генерирует уникальное имя
-- 4. Обе функции возвращают результат для клиентского приложения

-- ПРИМЕР ИСПОЛЬЗОВАНИЯ:
-- В JavaScript/TypeScript:
-- const { data: isAvailable } = await supabase.rpc('is_display_name_available', { check_display_name: 'myname' });
-- const { data: uniqueName } = await supabase.rpc('generate_unique_display_name', { base_name: 'myname' });
