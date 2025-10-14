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
      
      await audioElement.play();
      console.log('📱 Audio element playing successfully');
    }
  } catch (error) {
    console.error('📱 Failed to force play audio:', error);
  }
};
