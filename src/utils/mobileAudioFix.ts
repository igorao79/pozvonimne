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
