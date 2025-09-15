// Backend API configuration
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ringtones.onrender.com'

// API endpoints
export const API_ENDPOINTS = {
  getRingtone: (userId: string) => `${BACKEND_URL}/api/ringtones/${userId}`,
  uploadRingtone: (userId: string) => `${BACKEND_URL}/api/ringtones/${userId}`,
  removeRingtone: (userId: string) => `${BACKEND_URL}/api/ringtones/${userId}`,
} as const

// API utility functions
export const ringtoneAPI = {
  async get(userId: string) {
    console.log('🔍 API: Getting ringtone for user:', userId)
    const url = API_ENDPOINTS.getRingtone(userId)
    console.log('🔍 API: Fetching from URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('🔍 API: Response status:', response.status)
    console.log('🔍 API: Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('🔍 API: Error response:', errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('🔍 API: Success response:', result)
    return result
  },

  async upload(userId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(API_ENDPOINTS.uploadRingtone(userId), {
      method: 'POST',
      body: formData,
      // Не устанавливаем Content-Type для FormData - браузер сам установит с boundary
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  },

  async remove(userId: string) {
    const response = await fetch(API_ENDPOINTS.removeRingtone(userId), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }
}
