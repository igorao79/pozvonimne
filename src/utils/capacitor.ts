/**
 * Capacitor Integration Utilities
 * Утилиты для работы с нативными возможностями мобильных устройств
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Проверяет, запущено ли приложение на нативной платформе
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Получает текущую платформу
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Камера - Сделать фото или выбрать из галереи
 */
export const takePhoto = async (source: 'camera' | 'gallery' = 'camera') => {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      quality: 90,
    });
    
    return photo;
  } catch (error) {
    console.error('Ошибка при работе с камерой:', error);
    throw error;
  }
};

/**
 * Push-уведомления - Регистрация
 */
export const registerPushNotifications = async () => {
  if (!isNativePlatform()) {
    console.log('Push-уведомления доступны только на нативных платформах');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('Разрешение на Push-уведомления не предоставлено');
    }

    await PushNotifications.register();

    // Слушаем события
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  } catch (error) {
    console.error('Ошибка при регистрации Push-уведомлений:', error);
    throw error;
  }
};

/**
 * Локальные уведомления
 */
export const scheduleLocalNotification = async (title: string, body: string, id?: number) => {
  if (!isNativePlatform()) {
    console.log('Локальные уведомления доступны только на нативных платформах');
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: id || Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
  } catch (error) {
    console.error('Ошибка при создании локального уведомления:', error);
    throw error;
  }
};

/**
 * Проверка статуса сети
 */
export const getNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    return status;
  } catch (error) {
    console.error('Ошибка при получении статуса сети:', error);
    throw error;
  }
};

/**
 * Слушать изменения статуса сети
 */
export const addNetworkListener = (callback: (status: any) => void) => {
  Network.addListener('networkStatusChange', callback);
};

/**
 * Получить информацию о приложении
 */
export const getAppInfo = async () => {
  if (!isNativePlatform()) {
    return null;
  }

  try {
    const info = await App.getInfo();
    return info;
  } catch (error) {
    console.error('Ошибка при получении информации о приложении:', error);
    throw error;
  }
};

/**
 * Тактильная обратная связь (вибрация)
 */
export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    const impactStyle = style === 'light' 
      ? ImpactStyle.Light 
      : style === 'heavy' 
      ? ImpactStyle.Heavy 
      : ImpactStyle.Medium;

    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    console.error('Ошибка при вызове тактильной обратной связи:', error);
  }
};

/**
 * Настройка Status Bar
 */
export const setupStatusBar = async (dark: boolean = true) => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch (error) {
    console.error('Ошибка при настройке Status Bar:', error);
  }
};

/**
 * Клавиатура - скрыть
 */
export const hideKeyboard = async () => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await Keyboard.hide();
  } catch (error) {
    console.error('Ошибка при скрытии клавиатуры:', error);
  }
};

/**
 * Клавиатура - показать
 */
export const showKeyboard = async () => {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await Keyboard.show();
  } catch (error) {
    console.error('Ошибка при показе клавиатуры:', error);
  }
};

/**
 * Файловая система - сохранить файл
 */
export const saveFile = async (data: string, fileName: string, directory: Directory = Directory.Documents) => {
  if (!isNativePlatform()) {
    console.log('Файловая система доступна только на нативных платформах');
    return;
  }

  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: data,
      directory: directory,
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка при сохранении файла:', error);
    throw error;
  }
};

/**
 * Файловая система - прочитать файл
 */
export const readFile = async (fileName: string, directory: Directory = Directory.Documents) => {
  if (!isNativePlatform()) {
    console.log('Файловая система доступна только на нативных платформах');
    return;
  }

  try {
    const result = await Filesystem.readFile({
      path: fileName,
      directory: directory,
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка при чтении файла:', error);
    throw error;
  }
};

/**
 * Обработка глубоких ссылок (Deep Links)
 */
export const setupDeepLinks = (callback: (url: string) => void) => {
  if (!isNativePlatform()) {
    return;
  }

  App.addListener('appUrlOpen', (data) => {
    callback(data.url);
  });
};

/**
 * Обработка состояния приложения
 */
export const addAppStateListener = (callback: (isActive: boolean) => void) => {
  if (!isNativePlatform()) {
    return;
  }

  App.addListener('appStateChange', ({ isActive }) => {
    callback(isActive);
  });
};



