const EmptyState = () => {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <svg className="w-12 h-12 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p className="text-muted-foreground">Загрузка пользователей...</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Если список пустой - зарегистрируйте новых пользователей
      </p>
      <p className="text-xs text-destructive mt-2">
        ⚠️ Решение: выполните ТОЛЬКО supabase_updates.sql в SQL Editor Supabase
      </p>
      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
        ❌ НЕ выполняйте supabase_setup.sql - он удалит все данные!
      </p>
      <p className="text-xs text-primary mt-1">
        📋 supabase_updates.sql содержит: колонки status/last_seen, функцию set_user_offline, исправленную get_users_with_profiles
      </p>
    </div>
  )
}

export default EmptyState
