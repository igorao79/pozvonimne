-- SQL скрипт для обновления функции get_user_chats
-- Добавляет поле is_creator в результат загрузки чатов

-- Удаляем существующую функцию (так как меняется сигнатура возвращаемого типа)
DROP FUNCTION IF EXISTS get_user_chats(UUID);
DROP FUNCTION IF EXISTS get_user_chats();

-- Обновляем функцию get_user_chats чтобы включить информацию о создателе
CREATE OR REPLACE FUNCTION get_user_chats(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    type TEXT,
    name TEXT,
    avatar_url TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_sender_id UUID,
    last_message_sender_name TEXT,
    unread_count BIGINT,
    other_participant_id UUID,
    other_participant_name TEXT,
    other_participant_avatar TEXT,
    other_participant_is_creator BOOLEAN,
    other_participant_status TEXT,
    other_participant_last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Проверяем права доступа
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.type,
        CASE
            WHEN c.type = 'group' THEN c.name
            ELSE (
                SELECT COALESCE(up.display_name, up.username)
                FROM public.chat_participants cp_other
                JOIN public.user_profiles up ON cp_other.user_id = up.id
                WHERE cp_other.chat_id = c.id
                AND cp_other.user_id != user_uuid
                AND cp_other.left_at IS NULL
                LIMIT 1
            )
        END as name,
        CASE
            WHEN c.type = 'group' THEN c.avatar_url
            ELSE (
                SELECT up.avatar_url
                FROM public.chat_participants cp_other
                JOIN public.user_profiles up ON cp_other.user_id = up.id
                WHERE cp_other.chat_id = c.id
                AND cp_other.user_id != user_uuid
                AND cp_other.left_at IS NULL
                LIMIT 1
            )
        END as avatar_url,
        c.last_message,
        c.last_message_at,
        c.last_message_sender_id,
        COALESCE(sender_profile.display_name, sender_profile.username) as last_message_sender_name,
        COALESCE(
            (SELECT COUNT(*)::BIGINT
             FROM public.messages m
             WHERE m.chat_id = c.id
             AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
             AND m.sender_id != user_uuid
             AND m.is_deleted = FALSE
            ), 0
        ) as unread_count,
        (
            SELECT cp_other.user_id
            FROM public.chat_participants cp_other
            WHERE cp_other.chat_id = c.id
            AND cp_other.user_id != user_uuid
            AND cp_other.left_at IS NULL
            LIMIT 1
        ) as other_participant_id,
        (
            SELECT COALESCE(up.display_name, up.username)
            FROM public.chat_participants cp_other
            JOIN public.user_profiles up ON cp_other.user_id = up.id
            WHERE cp_other.chat_id = c.id
            AND cp_other.user_id != user_uuid
            AND cp_other.left_at IS NULL
            LIMIT 1
        ) as other_participant_name,
        (
            SELECT up.avatar_url
            FROM public.chat_participants cp_other
            JOIN public.user_profiles up ON cp_other.user_id = up.id
            WHERE cp_other.chat_id = c.id
            AND cp_other.user_id != user_uuid
            AND cp_other.left_at IS NULL
            LIMIT 1
        ) as other_participant_avatar,
        COALESCE(
            (
                SELECT up.is_creator
                FROM public.chat_participants cp_other
                JOIN public.user_profiles up ON cp_other.user_id = up.id
                WHERE cp_other.chat_id = c.id
                AND cp_other.user_id != user_uuid
                AND cp_other.left_at IS NULL
                LIMIT 1
            ), false
        ) as other_participant_is_creator,
        (
            SELECT up.status
            FROM public.chat_participants cp_other
            JOIN public.user_profiles up ON cp_other.user_id = up.id
            WHERE cp_other.chat_id = c.id
            AND cp_other.user_id != user_uuid
            AND cp_other.left_at IS NULL
            LIMIT 1
        ) as other_participant_status,
        (
            SELECT up.last_seen
            FROM public.chat_participants cp_other
            JOIN public.user_profiles up ON cp_other.user_id = up.id
            WHERE cp_other.chat_id = c.id
            AND cp_other.user_id != user_uuid
            AND cp_other.left_at IS NULL
            LIMIT 1
        ) as other_participant_last_seen,
        c.created_at,
        c.updated_at
    FROM public.chats c
    INNER JOIN public.chat_participants cp ON c.id = cp.chat_id
    LEFT JOIN public.user_profiles sender_profile ON c.last_message_sender_id = sender_profile.id
    WHERE cp.user_id = user_uuid
    AND cp.left_at IS NULL
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_user_chats(UUID) TO authenticated;

-- Комментарий
COMMENT ON FUNCTION get_user_chats(UUID) IS 'Возвращает список чатов пользователя с информацией о создателе приложения';

-- Проверяем результат (должен показать чат с igorao79 и флагом is_creator = true)
-- SELECT * FROM get_user_chats() WHERE other_participant_is_creator = true;
