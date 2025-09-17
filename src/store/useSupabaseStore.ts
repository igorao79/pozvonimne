import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseState {
  supabase: SupabaseClient
}

// Создаем единственный экземпляр Supabase клиента
const supabaseInstance = createClient()

const useSupabaseStore = create<SupabaseState>(() => ({
  supabase: supabaseInstance
}))

export default useSupabaseStore
