import React, { createContext, useEffect, useContext, useState } from "react";
import * as API from "../utils/api";

export const TelegramContext = createContext();

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error("useTelegram must be used within TelegramProvider");
  }
  return context;
};

export const TelegramProvider = ({ children }) => {
  const [webApp, setWebApp] = useState(null);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      setWebApp(tg);
      
      const telegramUser = tg.initDataUnsafe?.user;
      
      if (telegramUser && tg.initData) {
        setUser(telegramUser);
        // Отправляем только initData на сервер
        authenticateUser(tg.initData);
      } else {
        // DEBUG MODE: Mock авторизация для локальной разработки
        if (process.env.NODE_ENV === 'development') {
          // Новый JWT токен (expires: 2025-12-22)
          const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZWJ1Zy10ZXN0LXVzZXIiLCJ0ZWxlZ3JhbV9pZCI6OTk5OTk5OTk5LCJ1c2VybmFtZSI6InRlc3RfdXNlciIsImlhdCI6MTc2NTc2NDc5OSwiZXhwIjoxNzY2MzY5NTk5fQ.SAm2bjeB_XgEk8MdnNfgWfIYJH0aELHZDXimEg474KA';
          API.setToken(mockToken);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(true);
        }
      }
      
      if (tg.themeParams) {
        document.documentElement.style.setProperty(
          '--tg-theme-bg-color',
          tg.themeParams.bg_color || '#0f1624'
        );
      }
    } else {
      console.warn('[TelegramContext] window.Telegram.WebApp not available!');
      setIsAuthenticated(true);
    }
  }, []);

  // Аутентификация пользователя на сервере
  const authenticateUser = async (initData) => {
    if (!initData) {
      console.warn('[TelegramContext] No initData provided');
      setIsAuthenticated(true);
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await API.authenticateTelegram(initData);
      console.log('[TelegramContext] Auth response:', response);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError(error.message || "Failed to authenticate");
      setIsAuthenticated(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Вибрация при клике
  const hapticFeedback = (style = "light") => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        const styles = {
          light: "impact",
          medium: "impact",
          heavy: "impact",
          success: "notification",
          warning: "notification",
          error: "notification",
        };
        
        const type = styles[style] || "impact";
        
        if (type === "impact") {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        } else {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred(style);
        }
      }
    } catch (e) {
      console.warn("Haptic feedback not available", e);
    }
  };

  // Показать кнопку "Назад"
  const showBackButton = (callback) => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(callback);
    }
  };

  // Скрыть кнопку "Назад"
  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  };

  // Показать главную кнопку
  const showMainButton = (text, callback) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.show();
      webApp.MainButton.onClick(callback);
    }
  };

  // Скрыть главную кнопку
  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  };

  // Закрыть приложение
  const close = () => {
    if (webApp) {
      webApp.close();
    }
  };

  const value = {
    webApp,
    user,
    authError,
    isAuthenticating,
    isAuthenticated,
    hapticFeedback,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    close,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};