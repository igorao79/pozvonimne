-- ОТДЕЛЬНЫЙ SQL СКРИПТ ДЛЯ ОБНОВЛЕНИЯ USER METADATA В AUTH.USERS
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта

-- СКРИПТ ДЛЯ ОБНОВЛЕНИЯ USER METADATA В AUTH.USERS
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта
-- Функции уже добавлены в основной скрипт supabase_setup.sql

-- ШАГ 1: Проверяем что функции существуют
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('update_user_display_name', 'update_display_name_everywhere')
ORDER BY proname;

-- ШАГ 2: Тестируем функции (замените 'Новое имя' на желаемое отображаемое имя)
-- SELECT update_display_name_everywhere('Новое имя') AS display_name_updated;

-- ИНСТРУКЦИЯ:
-- 1. Если функции не существуют, выполните основной скрипт supabase_setup.sql
-- 2. Функция update_display_name_everywhere() обновляет display_name одновременно:
--    - В raw_user_meta_data таблицы auth.users (видно в Authentication -> Users)
--    - В поле display_name таблицы user_profiles
-- 3. Теперь изменения будут видны в панели управления Supabase

-- ПРОВЕРКА РАБОТЫ:
-- После выполнения функции update_display_name_everywhere('Тестовое имя'):
-- 1. В Authentication -> Users -> raw_user_meta_data появится "display_name": "Тестовое имя"
-- 2. В таблице user_profiles поле display_name обновится
-- 3. В приложении изменения отобразятся сразу
