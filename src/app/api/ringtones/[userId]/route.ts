import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Хранилище для временных файлов (в памяти)
const tempFiles = new Map<string, string>();

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const url = searchParams.get('url');

  try {
    if (action === 'stream' && url) {
      // Потоковое воспроизведение Mega.nz файла
      console.log(`🎵 Streaming Mega.nz file for user ${userId}:`, url);

      return new Promise((resolve, reject) => {
        // Создаем временный файл для хранения
        const tempFileName = `temp_${userId}_${Date.now()}.mp3`;
        const tempFilePath = path.join(process.cwd(), 'temp', tempFileName);

        // Скачиваем файл с Mega.nz
        const command = `megatools dl --no-progress --path "${tempFilePath}" "${url}"`;

        exec(command, async (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Megatools error:', error);
            resolve(NextResponse.json(
              { error: 'Не удалось скачать файл с Mega.nz' },
              { status: 500 }
            ));
            return;
          }

          try {
            // Читаем файл и возвращаем как поток
            const fileBuffer = await fs.readFile(tempFilePath);

            // Удаляем временный файл
            await fs.unlink(tempFilePath);

            // Возвращаем файл с правильными заголовками
            const response = new NextResponse(fileBuffer, {
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': fileBuffer.length.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
              },
            });

            resolve(response);

          } catch (fileError) {
            console.error('❌ File read error:', fileError);
            resolve(NextResponse.json(
              { error: 'Не удалось прочитать файл' },
              { status: 500 }
            ));
          }
        });
      });
    }

    // Обычный GET запрос для получения информации о рингтоне
    return NextResponse.json({
      success: true,
      url: 'https://mega.nz/file/example#hash',
      message: 'Используйте /api/ringtones/[userId]?action=stream&url=<mega_url> для потокового воспроизведения'
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Заглушка для POST запросов
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Заглушка для DELETE запросов
  return NextResponse.json({ success: true });
}
