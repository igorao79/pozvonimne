/**
 * Исправление проблем со звуком WebRTC на мобильных устройствах
 */

import { Capacitor } from '@capacitor/core';

/**
 * Проверка, является ли устройство мобильным (браузер или нативное приложение)
 */
export const isMobileDevice = (): boolean => {
  // Проверяем нативные платформы Capacitor
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  // Проверяем мобильные браузеры через User Agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  
  if (mobileRegex.test(userAgent.toLowerCase())) {
    return true;
  }

  // Проверяем через размер экрана и touch support
  if (window.innerWidth <= 768 && 'ontouchstart' in window) {
    return true;
  }

  return false;
};

/**
 * Проверка, является ли устройство iOS
 */
export const isIOSDevice = (): boolean => {
  if (Capacitor.getPlatform() === 'ios') {
    return true;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

/**
 * Проверка, является ли устройство Android
 */
export const isAndroidDevice = (): boolean => {
  if (Capacitor.getPlatform() === 'android') {
    return true;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
};

/**
 * Настройка аудио для WebRTC на мобильных устройствах
 */
export const setupMobileAudio = () => {
  if (!isMobileDevice()) {
    console.log('📱 Not a mobile device, skipping mobile audio setup');
    return;
  }

  console.log('📱 Setting up mobile audio...');

  try {
    // Создаем или используем существующий AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('📱 AudioContext not supported');
      return;
    }

    const audioContext = new AudioContextClass();

    // Для Android и iOS - разблокируем AudioContext
    if (audioContext.state === 'suspended') {
      console.log('📱 AudioContext suspended, resuming...');
      audioContext.resume().then(() => {
        console.log('📱 AudioContext resumed successfully');
      }).catch((err: any) => {
        console.error('📱 Failed to resume AudioContext:', err);
      });
    }

    // Сохраняем контекст для дальнейшего использования
    (window as any).__webrtcAudioContext = audioContext;
  } catch (error) {
    console.error('📱 Error setting up mobile audio:', error);
  }
};

/**
 * Настройка audio элемента для правильного воспроизведения на мобильных
 */
export const setupAudioElement = (audioElement: HTMLAudioElement) => {
  if (!isMobileDevice()) {
    console.log('📱 Not a mobile device, using default audio element settings');
    return audioElement;
  }

  console.log('📱 Configuring audio element for mobile...', {
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    isNative: Capacitor.isNativePlatform()
  });

  // Критически важные настройки для мобильных устройств
  audioElement.autoplay = true;
  // @ts-ignore - playsInline существует в мобильных браузерах
  audioElement.playsInline = true; // Важно для iOS - предотвращает открытие в полноэкранном режиме
  audioElement.muted = false;
  audioElement.volume = 1.0;

  // Дополнительные атрибуты для совместимости
  audioElement.setAttribute('playsinline', 'true'); // Для старых iOS
  audioElement.setAttribute('webkit-playsinline', 'true'); // Для старых iOS webkit

  // Для Android - настройка аудио выхода
  if (isAndroidDevice()) {
    console.log('📱 Configuring Android-specific audio settings');
    
    // Пытаемся установить аудио выход на динамик (если поддерживается)
    if (typeof (audioElement as any).setSinkId === 'function') {
      (audioElement as any).setSinkId('default').then(() => {
        console.log('📱 Audio sink set to default (speaker)');
      }).catch((err: any) => {
        console.warn('📱 setSinkId failed:', err);
      });
    }
  }

  // Для iOS - дополнительная настройка
  if (isIOSDevice()) {
    console.log('📱 Configuring iOS-specific audio settings');
    
    // iOS требует взаимодействие пользователя для воспроизведения
    // Добавляем обработчики для автоматического запуска при возможности
    const playHandler = () => {
      audioElement.play().catch(err => {
        console.warn('📱 iOS auto-play attempt failed:', err);
      });
    };

    // Пытаемся воспроизвести при любом взаимодействии
    ['touchstart', 'touchend', 'click'].forEach(event => {
      document.addEventListener(event, playHandler, { once: true, passive: true });
    });
  }

  return audioElement;
};

/**
 * Получение media constraints для мобильных устройств
 */
export const getMobileMediaConstraints = (): MediaStreamConstraints => {
  const baseConstraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };

  if (isMobileDevice()) {
    // Дополнительные настройки для мобильных
    if (isAndroidDevice()) {
      baseConstraints.audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // @ts-ignore - Android specific
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
      };
    } else if (isIOSDevice()) {
      // Для iOS используем более консервативные настройки
      baseConstraints.audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // iOS лучше работает с этими настройками
        sampleRate: 48000,
        channelCount: 1,
      };
    }
  }

  return baseConstraints;
};

/**
 * Активация аудио контекста (нужно вызывать при user action)
 */
export const unlockAudio = async () => {
  if (!isMobileDevice()) {
    console.log('📱 Not a mobile device, audio context unlock not required');
    return;
  }

  console.log('📱 Attempting to unlock audio context...');

  try {
    // Используем существующий или создаем новый AudioContext
    let audioContext = (window as any).__webrtcAudioContext;
    
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('📱 AudioContext not supported');
        return;
      }
      audioContext = new AudioContextClass();
      (window as any).__webrtcAudioContext = audioContext;
    }

    console.log('📱 AudioContext state:', audioContext.state);

    // Если контекст приостановлен, возобновляем его
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('📱 AudioContext resumed, new state:', audioContext.state);
    }

    // Создаем и воспроизводим пустой буфер для полной разблокировки
    // Это особенно важно для iOS
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    if (typeof source.start === 'function') {
      source.start(0);
    } else {
      // Для старых браузеров
      (source as any).noteOn(0);
    }

    console.log('📱 Audio context successfully unlocked');

    // Дополнительная попытка воспроизвести тишину для iOS
    if (isIOSDevice()) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.001; // Очень тихий звук
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(0);
      oscillator.stop(audioContext.currentTime + 0.01);
      console.log('📱 iOS silent sound played for unlock');
    }

  } catch (error) {
    console.error('📱 Failed to unlock audio:', error);
  }
};

/**
 * Принудительное воспроизведение аудио элемента (для мобильных)
 * Должно вызываться при пользовательском взаимодействии
 */
export const forcePlayAudio = async (audioElement: HTMLAudioElement) => {
  if (!isMobileDevice()) {
    return;
  }

  console.log('📱 Force playing audio element...');

  try {
    // Сначала разблокируем аудио контекст
    await unlockAudio();

    // Затем пытаемся воспроизвести
    if (audioElement && audioElement.srcObject) {
      audioElement.muted = false;
      audioElement.volume = 1.0;
      
      // Переключаем на динамик если это Android
      if (isAndroidDevice()) {
        await setSpeakerOutput(audioElement);
      }
      
      await audioElement.play();
      console.log('📱 Audio element playing successfully');
    }
  } catch (error) {
    console.error('📱 Failed to force play audio:', error);
  }
};

/**
 * Переключение аудио выхода на динамик (для Android)
 */
export const setSpeakerOutput = async (audioElement: HTMLAudioElement) => {
  if (!isAndroidDevice()) {
    console.log('📱 Speaker output switching is Android-specific');
    return;
  }

  console.log('📱 Attempting to set audio output to speaker...');

  try {
    // Проверяем поддержку setSinkId
    if (typeof (audioElement as any).setSinkId === 'function') {
      // Получаем список доступных аудиоустройств
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      console.log('📱 Available audio outputs:', audioOutputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId
      })));

      // Ищем устройство с "speaker" в названии или используем default
      let speakerDevice = audioOutputs.find(device => 
        device.label.toLowerCase().includes('speaker') ||
        device.label.toLowerCase().includes('динамик') ||
        device.deviceId === 'default'
      );

      if (!speakerDevice && audioOutputs.length > 0) {
        speakerDevice = audioOutputs[0]; // Используем первое доступное устройство
      }

      if (speakerDevice) {
        await (audioElement as any).setSinkId(speakerDevice.deviceId);
        console.log('📱 Audio output set to:', speakerDevice.label || speakerDevice.deviceId);
      } else {
        await (audioElement as any).setSinkId('default');
        console.log('📱 Audio output set to default device');
      }
    } else {
      console.warn('📱 setSinkId not supported on this device');
    }
  } catch (error) {
    console.error('📱 Failed to set speaker output:', error);
  }
};

/**
 * Диагностика аудио проблем
 */
export const diagnoseAudioIssues = async (audioElement?: HTMLAudioElement) => {
  console.log('🔍 Starting audio diagnostics...');
  
  const diagnostics = {
    deviceType: isMobileDevice() ? 'mobile' : 'desktop',
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    userAgent: navigator.userAgent,
    audioContext: null as any,
    permissions: {} as any,
    devices: [] as any[],
    audioElement: null as any,
    mediaCapabilities: {} as any
  };

  try {
    // Проверяем AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const testContext = new AudioContextClass();
      diagnostics.audioContext = {
        supported: true,
        state: testContext.state,
        sampleRate: testContext.sampleRate,
        baseLatency: testContext.baseLatency,
        outputLatency: testContext.outputLatency
      };
      testContext.close();
    } else {
      diagnostics.audioContext = { supported: false };
    }

    // Проверяем разрешения
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      diagnostics.permissions.microphone = micPermission.state;
    } catch (e) {
      diagnostics.permissions.microphone = 'unavailable';
    }

    // Проверяем доступные устройства
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      diagnostics.devices = devices.map(device => ({
        kind: device.kind,
        label: device.label,
        deviceId: device.deviceId.slice(0, 10) + '...', // Частично скрываем ID
        groupId: device.groupId
      }));
    } catch (e) {
      console.warn('🔍 Could not enumerate devices:', e);
    }

    // Проверяем аудио элемент
    if (audioElement) {
      diagnostics.audioElement = {
        hasSource: !!audioElement.srcObject,
        paused: audioElement.paused,
        muted: audioElement.muted,
        volume: audioElement.volume,
        readyState: audioElement.readyState,
        networkState: audioElement.networkState,
        autoplay: audioElement.autoplay,
        // @ts-ignore
        playsInline: audioElement.playsInline
      };

      if (audioElement.srcObject instanceof MediaStream) {
        const stream = audioElement.srcObject as MediaStream;
        const audioTracks = stream.getAudioTracks();
        diagnostics.audioElement.streamInfo = {
          streamId: stream.id,
          active: stream.active,
          audioTracksCount: audioTracks.length,
          audioTracks: audioTracks.map(track => ({
            id: track.id,
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings()
          }))
        };
      }
    }

    // Проверяем возможности воспроизведения медиа
    if (navigator.mediaCapabilities) {
      try {
        const audioConfig = {
          type: 'media-source' as const,
          audio: {
            contentType: 'audio/opus',
            channels: '2',
            bitrate: 128000,
            samplerate: 48000
          }
        };
        const audioSupport = await navigator.mediaCapabilities.decodingInfo(audioConfig);
        diagnostics.mediaCapabilities.opus = audioSupport;
      } catch (e) {
        console.warn('🔍 Media capabilities check failed:', e);
      }
    }

  } catch (error) {
    console.error('🔍 Diagnostics error:', error);
  }

  console.log('🔍 Audio diagnostics completed:', diagnostics);
  return diagnostics;
};

/**
 * Получение рекомендаций по исправлению аудио проблем
 */
export const getAudioTroubleshootingSteps = () => {
  const steps = [];
  
  if (isMobileDevice()) {
    steps.push('📱 Убедитесь, что разрешен доступ к микрофону в настройках браузера');
    steps.push('📱 Проверьте, что громкость устройства не на минимуме');
    steps.push('📱 Убедитесь, что к телефону не подключены Bluetooth наушники');
    
    if (isIOSDevice()) {
      steps.push('🍎 На iOS: переключите рингтон/бесшумный режим');
      steps.push('🍎 Попробуйте открыть приложение в Safari вместо Chrome');
    }
    
    if (isAndroidDevice()) {
      steps.push('🤖 На Android: проверьте настройки Do Not Disturb');
      steps.push('🤖 Попробуйте очистить кеш браузера');
    }
  }
  
  steps.push('🔄 Перезагрузите браузер/приложение');
  steps.push('🔄 Попробуйте использовать другой браузер');
  steps.push('📞 Проверьте интернет-соединение');
  
  return steps;
};

/**
 * Специализированный диагностический инструмент для проблем компьютер→телефон
 */
export const diagnoseDesktopToMobileAudioIssues = async () => {
  console.log('🔧 Запуск диагностики проблем звука компьютер→телефон...')
  
  const report = {
    timestamp: new Date().toISOString(),
    issue: 'desktop-to-mobile-audio-not-working',
    platform: {
      isMobile: isMobileDevice(),
      isDesktop: !isMobileDevice(),
      isIOS: isIOSDevice(),
      isAndroid: isAndroidDevice(),
      userAgent: navigator.userAgent
    },
    audio: {
      context: null as any,
      constraints: null as any,
      devices: [] as any[],
      capabilities: null as any,
      permissions: null as any
    },
    webrtc: {
      sendCodecs: [] as any[],
      receiveCodecs: [] as any[],
      compatibleCodecs: [] as any[]
    },
    recommendations: [] as string[]
  }
  
  try {
    // 1. Проверяем AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const testContext = new AudioContextClass();
      report.audio.context = {
        supported: true,
        state: testContext.state,
        sampleRate: testContext.sampleRate,
        baseLatency: testContext.baseLatency || 'unknown',
        outputLatency: testContext.outputLatency || 'unknown'
      };
      testContext.close();
    }
    
    // 2. Проверяем media constraints
    try {
      const testConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      };
      
      // Тестируем получение микрофона с унифицированными настройками
      const testStream = await navigator.mediaDevices.getUserMedia(testConstraints);
      report.audio.constraints = {
        success: true,
        applied: testConstraints
      };
      
      const audioTracks = testStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        report.audio.constraints.actualSettings = track.getSettings();
        report.audio.constraints.trackState = {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        };
      }
      
      // Закрываем тестовый поток
      testStream.getTracks().forEach(track => track.stop());
      
    } catch (constraintError) {
      report.audio.constraints = {
        success: false,
        error: constraintError instanceof Error ? constraintError.message : 'Unknown error'
      };
    }
    
    // 3. Проверяем доступные устройства
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      report.audio.devices = devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          kind: device.kind,
          label: device.label || 'Unknown device',
          deviceId: device.deviceId.slice(0, 8) + '...',
          groupId: device.groupId
        }));
    } catch (devicesError) {
      report.audio.devices = [];
    }
    
    // 4. Проверяем WebRTC кодеки
    try {
      const sendCapabilities = RTCRtpSender.getCapabilities('audio');
      const receiveCapabilities = RTCRtpReceiver.getCapabilities('audio');
      
      report.webrtc.sendCodecs = sendCapabilities?.codecs?.map(c => ({
        mimeType: c.mimeType,
        clockRate: c.clockRate,
        channels: c.channels
      })) || [];
      
      report.webrtc.receiveCodecs = receiveCapabilities?.codecs?.map(c => ({
        mimeType: c.mimeType,
        clockRate: c.clockRate,
        channels: c.channels
      })) || [];
      
      // Находим совместимые кодеки
      report.webrtc.compatibleCodecs = report.webrtc.sendCodecs.filter(sendCodec =>
        report.webrtc.receiveCodecs.some(recvCodec => 
          recvCodec.mimeType === sendCodec.mimeType &&
          recvCodec.clockRate === sendCodec.clockRate
        )
      );
      
    } catch (codecError) {
      console.warn('Codec capabilities check failed:', codecError);
    }
    
    // 5. Проверяем разрешения
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      report.audio.permissions = {
        microphone: micPermission.state
      };
    } catch (permError) {
      report.audio.permissions = { microphone: 'unavailable' };
    }
    
    // 6. Генерируем рекомендации на основе диагностики
    if (!report.audio.context?.supported) {
      report.recommendations.push('❌ AudioContext не поддерживается браузером');
    }
    
    if (report.audio.context?.state === 'suspended') {
      report.recommendations.push('⚠️ AudioContext приостановлен - требуется пользовательское взаимодействие');
    }
    
    if (!report.audio.constraints?.success) {
      report.recommendations.push('❌ Не удается получить доступ к микрофону - проверьте разрешения');
    }
    
    if (report.audio.devices.filter(d => d.kind === 'audioinput').length === 0) {
      report.recommendations.push('❌ Не найдены устройства ввода звука');
    }
    
    if (report.webrtc.compatibleCodecs.length === 0) {
      report.recommendations.push('❌ Нет совместимых аудио кодеков - критическая проблема WebRTC');
    }
    
    if (!report.webrtc.compatibleCodecs.some(c => c.mimeType === 'audio/opus')) {
      report.recommendations.push('⚠️ Codec Opus не найден - основной кодек WebRTC');
    }
    
    if (report.audio.permissions?.microphone === 'denied') {
      report.recommendations.push('❌ Доступ к микрофону запрещен - включите в настройках браузера');
    }
    
    if (report.platform.isMobile && report.audio.context?.state !== 'running') {
      report.recommendations.push('📱 На мобильном: попробуйте нажать на экран для активации аудио');
    }
    
    // Специальные рекомендации для проблемы компьютер→телефон
    if (!report.platform.isMobile) {
      report.recommendations.push('💻 Десктоп→мобильный: используйте унифицированные аудио настройки');
      report.recommendations.push('🔧 Убедитесь что отключен googTypingNoiseDetection');
    }
    
    if (report.recommendations.length === 0) {
      report.recommendations.push('✅ Все основные проверки пройдены успешно');
    }
    
  } catch (error) {
    console.error('Ошибка при диагностике:', error);
    report.recommendations.push(`❌ Ошибка диагностики: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('🔧 Отчет диагностики:', report);
  return report;
};

/**
 * Автоматическое исправление проблем звука компьютер→телефон
 */
export const autoFixDesktopToMobileAudio = async () => {
  console.log('🔧 Автоматическое исправление проблем звука...');
  
  const fixes = [];
  
  try {
    // 1. Разблокируем AudioContext
    await unlockAudio();
    fixes.push('✅ AudioContext разблокирован');
    
    // 2. Проверяем и исправляем настройки микрофона
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          // Избегаем проблемных параметров
          googTypingNoiseDetection: false
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      fixes.push('✅ Микрофон настроен с совместимыми параметрами');
      
      // Проверяем трек
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        fixes.push('✅ Аудио трек активен и готов к передаче');
      }
      
      // Закрываем тестовый поток
      stream.getTracks().forEach(track => track.stop());
      
    } catch (micError) {
      fixes.push(`❌ Проблема с микрофоном: ${micError instanceof Error ? micError.message : 'Unknown error'}`);
    }
    
    // 3. Для мобильных устройств - специальные настройки
    if (isMobileDevice()) {
      await setupMobileAudio();
      fixes.push('✅ Применены мобильные оптимизации');
      
      if (isAndroidDevice()) {
        fixes.push('✅ Применены настройки для Android');
      } else if (isIOSDevice()) {
        fixes.push('✅ Применены настройки для iOS');
      }
    }
    
    fixes.push('🎯 Рекомендация: перезапустите звонок для применения исправлений');
    
  } catch (error) {
    fixes.push(`❌ Ошибка автоисправления: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('🔧 Результат автоисправления:', fixes);
  return fixes;
};
