// Debug utilities for production
export const logEnvironment = () => {
  if (typeof window !== 'undefined') {
    console.log('🔧 Environment Check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      nodeEnv: process.env.NODE_ENV,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    })
  }
}

export const validateSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('❌ Supabase configuration missing')
    return false
  }
  
  if (!url.startsWith('https://')) {
    console.error('❌ Invalid Supabase URL format')
    return false
  }
  
  if (key.length < 100) {
    console.error('❌ Supabase key seems too short')
    return false
  }
  
  console.log('✅ Supabase configuration looks valid')
  return true
}
