/**
 * Исправление проблем со звуком WebRTC на мобильных устройствах
 */

import { Capacitor } from '@capacitor/core';

/**
 * Настройка аудио для WebRTC на мобильных устройствах
 */
export const setupMobileAudio = () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Для Android - включаем громкую связь
  if (Capacitor.getPlatform() === 'android') {
    // Устанавливаем максимальную громкость для media stream
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext.resume();
  }
};

/**
 * Настройка audio элемента для правильного воспроизведения на мобильных
 */
export const setupAudioElement = (audioElement: HTMLAudioElement) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Критически важно для мобильных устройств
  audioElement.autoplay = true;
  // @ts-ignore - playsInline существует в мобильных браузерах
  audioElement.playsInline = true; // Важно для iOS
  audioElement.muted = false;
  
  // Устанавливаем максимальную громкость
  audioElement.volume = 1.0;

  // Для Android - используем громкую связь
  if (Capacitor.getPlatform() === 'android') {
    // @ts-ignore - Android specific
    if (audioElement.setSinkId) {
      // @ts-ignore
      audioElement.setSinkId('default').catch((err: any) => {
        console.warn('setSinkId failed:', err);
      });
    }
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

  if (Capacitor.isNativePlatform()) {
    // Дополнительные настройки для мобильных
    if (Capacitor.getPlatform() === 'android') {
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
    }
  }

  return baseConstraints;
};

/**
 * Активация аудио контекста (нужно вызывать при user action)
 */
export const unlockAudio = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Создаем и воспроизводим пустой буфер для разблокировки
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    await audioContext.resume();
    console.log('Audio context unlocked');
  } catch (error) {
    console.error('Failed to unlock audio:', error);
  }
};
