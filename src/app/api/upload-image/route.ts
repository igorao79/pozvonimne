import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

const CLOUD_NAME = process.env.CLOUD_NAME
const API_KEY = process.env.API_KEY_CLOADINARY
const API_SECRET = process.env.API_SECRET_CLOADINARY

console.log('Cloudinary config:', { CLOUD_NAME, API_KEY: API_KEY?.slice(0, 10) + '...' })

// Настраиваем Cloudinary
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    console.log('API upload-image called with env vars:', {
      CLOUD_NAME: !!CLOUD_NAME,
      API_KEY: !!API_KEY,
      API_SECRET: !!API_SECRET
    })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatId = formData.get('chatId') as string

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    if (!chatId) {
      return NextResponse.json({ error: 'chatId не указан' }, { status: 400 })
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 })
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой. Максимальный размер: 10MB' }, { status: 400 })
    }

    // Конвертируем файл в buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Создаем папку для чата
    const folderPath = `chats/${chatId}`

    // Загружаем изображение на Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: 'image',
          format: 'webp',
          transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto', format: 'webp' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      ).end(buffer)
    })

    const uploadResult = result as any

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileName: file.name
    })

  } catch (error) {
    console.error('Ошибка загрузки изображения:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки изображения' },
      { status: 500 }
    )
  }
}
