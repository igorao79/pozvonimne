import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    CLOUD_NAME: process.env.CLOUD_NAME,
    API_KEY_CLOADINARY: process.env.API_KEY_CLOADINARY ? '***' + process.env.API_KEY_CLOADINARY.slice(-4) : undefined,
    API_SECRET_CLOADINARY: process.env.API_SECRET_CLOADINARY ? '***' + process.env.API_SECRET_CLOADINARY.slice(-4) : undefined,
    NEXT_PUBLIC_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  })
}
