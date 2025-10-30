import { NextRequest, NextResponse } from 'next/server'

interface DonationAlertsTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Не предоставлен код авторизации' },
        { status: 400 }
      )
    }

    const clientId = process.env.DA_ID
    const clientSecret = process.env.DA_KEY
    const redirectUri = 'http://localhost:3000/oauth/callback'

    if (!clientId || !clientSecret) {
      console.error('Отсутствуют переменные окружения DA_ID или DA_KEY')
      return NextResponse.json(
        { error: 'Конфигурация сервера не настроена' },
        { status: 500 }
      )
    }

    // Обмениваем код на токен доступа
    const tokenResponse = await fetch('https://www.donationalerts.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Ошибка при получении токена:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        clientId,
        redirectUri
      })
      return NextResponse.json(
        { error: `Не удалось получить токен доступа: ${errorText}` },
        { status: 400 }
      )
    }

    const tokenData: DonationAlertsTokenResponse = await tokenResponse.json()

    // Получаем информацию о пользователе из DonationAlerts
    const userInfoResponse = await fetch('https://www.donationalerts.com/api/v1/user/oauth', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Не удалось получить информацию о пользователе DonationAlerts' },
        { status: 400 }
      )
    }

    const donationAlertsUser = await userInfoResponse.json()
    
    // Сохраняем токен и информацию для дальнейшего использования
    // Возвращаем URL для реального доната вместо автоматической активации
    const donateUrl = `https://www.donationalerts.com/r/${donationAlertsUser.data.name}`
    
    return NextResponse.json({
      success: true,
      message: 'Авторизация успешна. Для активации премиума нужно сделать донат 10 рублей.',
      donate_url: donateUrl,
      user_info: donationAlertsUser.data
    })

  } catch (error) {
    console.error('Ошибка в API endpoint:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
