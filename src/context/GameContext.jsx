import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import Background1 from "../assets/images/background_lvl1.png"
import Background2 from "../assets/images/background_lvl2.png"
import Background3 from "../assets/images/background_lvl3.png"
import Tooth1 from "../assets/images/tooth1.png"
import Tooth2 from "../assets/images/tooth2.png"
import Tooth3 from "../assets/images/tooth3.png"
import Char1 from "../assets/images/char1.apng"
import Char2 from "../assets/images/char2.apng"
import Char3 from "../assets/images/char3.apng"
import * as API from "../utils/api";
import ServicePurchaseToast from "../components/ServicePurchaseToast";
import { initWebSocket, onServicePurchased, disconnectWebSocket } from "../utils/websocket";

export const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};

export const GameProvider = ({ children }) => {
    // ========== ОСНОВНЫЕ ИГРОВЫЕ ПАРАМЕТРЫ ==========
  // Инициализируем дефолтными значениями, сервер переинициализирует через loadGameState()
  
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(10000);
  const [energyRegenRate, setEnergyRegenRate] = useState(1);
  const [baseCoinsPerClick, setBaseCoinsPerClick] = useState(1);
  const [coinsPerClick, setCoinsPerClick] = useState(1);
  
  // Опыт и прогресс (отправляется сервером)
  const [expCurrent, setExpCurrent] = useState(0);
  const [expRequired, setExpRequired] = useState(100);
  
  // Активный бонус от сервера
  const [activeBonus, setActiveBonus] = useState(null);
  
  // Визуальные элементы (отправляются сервером при разблокировке)
  const [toothImage, setToothImage] = useState(Tooth1);
  const [background, setBackground] = useState(Background1);
  const [character, setCharacter] = useState(Char1);
  
  // Профиль пользователя (загружается из Telegram WebApp)
  const [userProfile, setUserProfile] = useState({
    name: "Игрок",
    photo: "/assets/images/profile-placeholder.png"
  });
  
  // User data from backend
  const [user, setUser] = useState(null);

  // ========== УЛУЧШЕНИЯ И СЕРВИСЫ ==========
  // Загружаются с сервера
  
  const [upgrades, setUpgrades] = useState([]);
  const [services, setServices] = useState([]);
  const [userUpgrades, setUserUpgrades] = useState([]);
  const [userServices, setUserServices] = useState([]); // Покупленные услуги
  const [loadingUpgrades, setLoadingUpgrades] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Toast для уведомлений о покупке услуг
  const [purchaseToast, setPurchaseToast] = useState(null);
  
  // ========== ЗАДАЧИ ==========
  // Загружаются с сервера
  
  const [dailyTasks, setDailyTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [loginRewards, setLoginRewards] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ========== AUTO-CLICKER ==========
  // Статус автокликера с сервера
  const [autoClickerStatus, setAutoClickerStatus] = useState({
    level: 0,
    is_active: false,
    offline_seconds: 0,
    offline_earnings: 0,
    current_config: null,
    next_level_config: null,
  });
  
  // КРИТИЧНО: Мемоизированные значения доходов - должны быть состоянием для правильного обновления UI
  const [autoClickerIncomeValue, setAutoClickerIncomeValue] = useState(0);
  const [totalCoinsPerHourValue, setTotalCoinsPerHourValue] = useState(0);

  // ========== СИСТЕМА РАЗБЛОКИРОВОК ==========
  // Хранятся как Sets для быстрой проверки, получаются с сервера
  const [unlockedCharacters, setUnlockedCharacters] = useState(new Set([1]));
  const [unlockedTeeth, setUnlockedTeeth] = useState(new Set([1]));
  const [unlockedBackgrounds, setUnlockedBackgrounds] = useState(new Set([1]));
  
  // Счетчик приглашенных друзей
  const [invitedFriendsCount, setInvitedFriendsCount] = useState(0);
  
  // Счетчики для заданий (сбрасываются при сбросе заданий)
  const [dailyInvitedFriends, setDailyInvitedFriends] = useState(0);
  const [weeklyInvitedFriends, setWeeklyInvitedFriends] = useState(0);
  
  // Флаг: был ли начат отсчет 7 дней ПОСЛЕ разблокировки зуба 2
  const [loginStreakStartedAfterTooth2, setLoginStreakStartedAfterTooth2] = useState(false);
  
  // Счетчик дней входа (работает только если loginStreakStartedAfterTooth2 === true)
  const [currentLoginStreak, setCurrentLoginStreak] = useState(0);
  
  // Локальные Sets для отслеживания купленных апгрейдов и уровней автокликера
  const [purchasedUpgrades, setPurchasedUpgrades] = useState(new Set());
  const [purchasedAutoClickerLevels, setPurchasedAutoClickerLevels] = useState(new Set());
  
  // Отслеживание общего количества тапов для разблокировок
  const [totalTaps, setTotalTaps] = useState(0);

  // ========== БАТЧИНГ КЛИКОВ ==========
  // Накопление кликов для отправки батчем на сервер каждые 150ms
  
  const clickBatchRef = useRef({ clicks: 0, timestamps: [] });
  const clickBatchTimeoutRef = useRef(null);

  // ========== СИСТЕМА БОНУСОВ ==========
  
  // Активация бонуса к тапам (множитель к coins_per_click)
  const activateTapBonus = (multiplier, durationMinutes) => {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    const bonus = {
      type: 'tap_multiplier',
      multiplier: multiplier,
      expiresAt: expiresAt,
      durationMinutes: durationMinutes
    };
    
    setActiveBonus(bonus);
    // Пересчитываем coinsPerClick сразу
    setCoinsPerClick(baseCoinsPerClick * multiplier);
    
    return bonus;
  };
  
  // Проверка и удаление истекших бонусов
  useEffect(() => {
    if (activeBonus && activeBonus.expiresAt) {
      const checkExpiration = () => {
        if (Date.now() >= activeBonus.expiresAt) {
          // Бонус истек
          setActiveBonus(null);
          setCoinsPerClick(baseCoinsPerClick);
        }
      };
      
      // Проверяем каждую секунду
      const interval = setInterval(checkExpiration, 1000);
      
      // Проверяем сразу
      checkExpiration();
      
      return () => clearInterval(interval);
    }
  }, [activeBonus, baseCoinsPerClick]);
  
  // Пересчитываем coinsPerClick при изменении бонуса или базового значения
  useEffect(() => {
    if (activeBonus && (activeBonus.type === 'tap_multiplier' || activeBonus.type === 'click_multiplier')) {
      const newCoinsPerClick = baseCoinsPerClick * activeBonus.multiplier;
      setCoinsPerClick(newCoinsPerClick);
    } else {
      setCoinsPerClick(baseCoinsPerClick);
    }
  }, [baseCoinsPerClick, activeBonus]);

  // Логируем изменения activeBonus для отладки
  // (removed for production - too verbose)

  // ========== ВОССТАНОВЛЕНИЕ ЭНЕРГИИ ==========
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(prev => {
        if (prev < maxEnergy) {
          // Используем energy_regen_rate с сервера вместо hardcoded формулы
          return Math.min(prev + energyRegenRate, maxEnergy);
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [maxEnergy, energyRegenRate]);

  // ========== ВИЗУАЛЬНЫЕ ЭЛЕМЕНТЫ ==========
  
  // Обновляем визуальные элементы: выбираем максимально разблокированный уровень
  const updateVisuals = (currentLevel) => {
    // Выбираем максимально разблокированный зуб
    let toothLevel = 1;
    if (unlockedTeeth.has(3)) toothLevel = 3;
    else if (unlockedTeeth.has(2)) toothLevel = 2;
    
    // Выбираем максимально разблокированный фон
    let bgLevel = 1;
    if (unlockedBackgrounds.has(3)) bgLevel = 3;
    else if (unlockedBackgrounds.has(2)) bgLevel = 2;
    
    // Выбираем максимально разблокированного персонажа
    let charLevel = 1;
    if (unlockedCharacters.has(3)) charLevel = 3;
    else if (unlockedCharacters.has(2)) charLevel = 2;
    
    // Устанавливаем выбранные изображения
    setToothImage(toothLevel === 1 ? Tooth1 : toothLevel === 2 ? Tooth2 : Tooth3);
    setBackground(bgLevel === 1 ? Background1 : bgLevel === 2 ? Background2 : Background3);
    setCharacter(charLevel === 1 ? Char1 : charLevel === 2 ? Char2 : Char3);
  };

  useEffect(() => {
    updateVisuals(level);
  }, [level, unlockedTeeth, unlockedBackgrounds, unlockedCharacters]);

  // ========== ЛОГИКА РАЗБЛОКИРОВОК ==========
  
  // ЭТАП 2.1: Персонаж 2 разблокируется через 1 друга
  useEffect(() => {
    if (!unlockedCharacters.has(2) && invitedFriendsCount >= 1) {
      setUnlockedCharacters(prev => new Set([...prev, 2]));
    }
  }, [invitedFriendsCount]);

  // ЭТАП 2.1б: Персонаж 2 разблокируется через 10000 тапов
  useEffect(() => {
    if (!unlockedCharacters.has(2) && totalTaps >= 10000) {
      setUnlockedCharacters(prev => new Set([...prev, 2]));
    }
  }, [totalTaps]);

  // ========== ЭТАП 3: РАЗБЛОКИРОВКА ЗУБОВ ==========
  
  // ЭТАП 3.1: Зуб 2 разблокируется при покупке апгрейда 2
  // (Это уже реализовано в функции purchaseUpgrade)
  
  // ЭТАП 3.2: Зуб 3 разблокируется через апгрейд 5 ИЛИ 3 друга
  useEffect(() => {
    if (!unlockedTeeth.has(3)) {
      // Условие 1: Куплен апгрейд 5
      if (purchasedUpgrades.has(5)) {
        setUnlockedTeeth(prev => new Set([...prev, 3]));
      }
      // Условие 2: 3 друга приглашены
      else if (invitedFriendsCount >= 3) {
        setUnlockedTeeth(prev => new Set([...prev, 3]));
      }
    }
  }, [purchasedUpgrades, invitedFriendsCount]);

  // ЭТАП 4: Персонаж 3 разблокируется через приглашение 7 друзей ИЛИ покупку за 1М монет
  // ТРЕБУЕТ: Персонаж 2 должен быть разблокирован
  useEffect(() => {
    if (!unlockedCharacters.has(3) && unlockedCharacters.has(2)) {
      // Только через приглашение 7 друзей (автоматическая разблокировка)
      if (invitedFriendsCount >= 7) {
        setUnlockedCharacters(prev => new Set([...prev, 3]));
      }
      // Покупка за 1М монет происходит через purchaseCharacter3() - НЕ автоматически!
    }
  }, [invitedFriendsCount, unlockedCharacters]);

  // ========== ЭТАП 5-6: РАЗБЛОКИРОВКА ФОНОВ ==========
  
  // ЭТАП 5: Background 2 разблокируется на день 7 login streak
  // ТРЕБУЕТ: Зуб 2 должен быть разблокирован И loginStreakStartedAfterTooth2 = true
  useEffect(() => {
    if (!unlockedBackgrounds.has(2) && unlockedTeeth.has(2) && loginStreakStartedAfterTooth2) {
      // Проверяем: прошло 7 дней
      if (currentLoginStreak >= 7) {
        setUnlockedBackgrounds(prev => new Set([...prev, 2]));
      }
    }
  }, [currentLoginStreak, unlockedTeeth, loginStreakStartedAfterTooth2, unlockedBackgrounds]);

  // ЭТАП 6: Background 3 разблокируется через weekly quest reward
  // ТРЕБУЕТ: Background 2 должен быть разблокирован
  useEffect(() => {
    if (!unlockedBackgrounds.has(3) && unlockedBackgrounds.has(2)) {
      // Проверяем: есть ли завершенные weekly quests (это будет отслеживаться через API)
      // На данный момент добавляем заглушку для логирования
    }
  }, [unlockedBackgrounds]);

  // ========== ЭТАП 7-8: РАЗБЛОКИРОВКА СЕРВИСОВ ==========
  
  // ЭТАП 7: Service 4 (Cleaning) разблокируется когда Background 2 разблокирован
  useEffect(() => {
    if (unlockedBackgrounds.has(2)) {
      // Service 4 становится доступным - это будет отражено в UI
    }
  }, [unlockedBackgrounds]);

  // ЭТАП 8: Service 3 (30% discount) разблокируется при 30 приглашенных друзьях
  useEffect(() => {
    if (invitedFriendsCount >= 30) {
      // Service 3 становится доступным
    }
  }, [invitedFriendsCount]);

  // ========== ЭТАП 9: ЛОГИРОВАНИЕ И СИНХРОНИЗАЦИЯ ==========
  
  // Логирование изменений всех разблокировок для отладки
  useEffect(() => {
    // Unlock state tracking
  }, [
    unlockedCharacters,
    unlockedTeeth,
    unlockedBackgrounds,
    invitedFriendsCount,
    loginStreakStartedAfterTooth2,
    currentLoginStreak,
    purchasedUpgrades,
    purchasedAutoClickerLevels,
  ]);

  // ========== ОБРАБОТКА КЛИКОВ ==========
  
  // Вычисление требуемого опыта для уровня (формула: 100 * 1.5^(level-1))
  const calculateExpRequired = (level) => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  };

  // Вычисление опыта для текущего уровня (остаток после всех левелапов)
  const calculateExpForCurrentLevel = (totalExp, level) => {
    let expUsed = 0;
    for (let i = 1; i < level; i++) {
      expUsed += calculateExpRequired(i);
    }
    return totalExp - expUsed;
  };

  // Основной обработчик клика
  // ...existing code...
  // Основной обработчик клика
  const handleClick = () => {
    const multiplier = activeBonus?.multiplier || 1;
    const actualEnergyPerClick = Math.min(baseCoinsPerClick * multiplier, 10);
    
    // Проверяем, хватает ли энергии для клика
    if (energy >= actualEnergyPerClick) {
      const actualCoinsPerClick = baseCoinsPerClick * multiplier;
      const actualExpPerClick = baseCoinsPerClick * multiplier;

      setCoins(prev => prev + actualCoinsPerClick);
      setEnergy(prev => Math.max(0, prev - actualEnergyPerClick));
      setTotalTaps(prev => prev + 1);

      // Локально обновляем прогресс задачи "тапы" (например, 20000 тапов)
      setDailyTasks(prevTasks => prevTasks.map(task => {
        // Можно добавить более точную проверку по id или типу задачи
        if (
          (task.title && task.title.toLowerCase().includes('тап')) ||
          (task.name && task.name.toLowerCase().includes('тап')) ||
          (task.requirement_value && Number(task.requirement_value) >= 10000)
        ) {
          // Не увеличиваем, если задача уже завершена
          if (task.completed) return task;
          const newProgress = Math.min((parseInt(task.progress) || 0) + 1, parseInt(task.maxProgress) || parseInt(task.requirement_value) || 20000);
          return {
            ...task,
            progress: newProgress,
            completed: newProgress >= (parseInt(task.maxProgress) || parseInt(task.requirement_value) || 20000)
          };
        }
        return task;
      }));

      // Локально обновляем прогресс weeklyTasks
      setWeeklyTasks(prevTasks => prevTasks.map(task => {
        if (
          (task.title && task.title.toLowerCase().includes('тап')) ||
          (task.name && task.name.toLowerCase().includes('тап')) ||
          (task.requirement_value && Number(task.requirement_value) >= 10000)
        ) {
          if (task.completed) return task;
          const newProgress = Math.min((parseInt(task.progress) || 0) + 1, parseInt(task.maxProgress) || parseInt(task.requirement_value) || 20000);
          return {
            ...task,
            progress: newProgress,
            completed: newProgress >= (parseInt(task.maxProgress) || parseInt(task.requirement_value) || 20000)
          };
        }
        return task;
      }));

      // Добавляем опыт локально с учетом множителя
      let newExp = expCurrent + actualExpPerClick;
      let newLevel = level;
      let currentExpRequired = expRequired;
      
      while (newExp >= currentExpRequired) {
        newExp = newExp - currentExpRequired;
        newLevel++;
        currentExpRequired = calculateExpRequired(newLevel);
      }
      
      if (newLevel > level) {
        setLevel(newLevel);
        setExpRequired(currentExpRequired);
      }
      setExpCurrent(newExp);

      clickBatchRef.current.clicks += 1;
      clickBatchRef.current.timestamps.push(Date.now());
      if (clickBatchTimeoutRef.current) {
        clearTimeout(clickBatchTimeoutRef.current);
      }
      clickBatchTimeoutRef.current = setTimeout(() => {
        if (clickBatchRef.current.clicks > 0) {
          const clickData = {
            clicks: clickBatchRef.current.clicks,
            timestamps: clickBatchRef.current.timestamps,
            coinsPerClick: baseCoinsPerClick
          };
          const sent = API.sendWebSocketMessage('game:click', clickData);
          if (!sent) {
            // Retry логика с экспоненциальной задержкой
            const sendWithRetry = async (data, attempt = 1, maxAttempts = 3) => {
              try {
                await API.sendClick(data);
              } catch (err) {
                if (attempt < maxAttempts) {
                  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s (макс 5s)
                  console.warn(`[GameContext] Click sync failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return sendWithRetry(data, attempt + 1, maxAttempts);
                } else {
                  console.error('[GameContext] Failed to send clicks after', maxAttempts, 'attempts:', err);
                }
              }
            };
            sendWithRetry(clickData);
          }
          clickBatchRef.current = { clicks: 0, timestamps: [] };
        }
      }, 150);
    }
  };



  // ========== ИНТЕГРАЦИЯ С СЕРВЕРОМ ==========
  
  // Загрузка всех доступных улучшений
  const loadUpgrades = async () => {
    try {
      setLoadingUpgrades(true);
      const data = await API.getUpgrades();
      // Обработка ответа сервера - может быть в формате {data: [...]} или [...]
      let upgradesList = [];
      if (Array.isArray(data)) {
        upgradesList = data;
      } else if (data && Array.isArray(data.data)) {
        upgradesList = data.data;
      } else if (data && data.upgrades && Array.isArray(data.upgrades)) {
        upgradesList = data.upgrades;
      }
      setUpgrades(upgradesList);
    } catch (error) {
      console.error('[GameContext] Failed to load upgrades:', error);
      setUpgrades([]);
    } finally {
      setLoadingUpgrades(false);
    }
  };

  // Загрузка всех доступных сервисов
  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const data = await API.getServices();
      // Обработка ответа сервера - может быть в формате {data: [...]} или [...]
      let servicesList = [];
      if (Array.isArray(data)) {
        servicesList = data;
      } else if (data && Array.isArray(data.data)) {
        servicesList = data.data;
      } else if (data && data.services && Array.isArray(data.services)) {
        servicesList = data.services;
      }
      // Маппинг cost_coins -> cost для совместимости с логикой проверок
      const mappedServices = servicesList.map(service => ({
        ...service,
        cost: service.cost_coins ? Number(service.cost_coins) : 0
      }));
      setServices(mappedServices);
    } catch (error) {
      console.error('[GameContext] Failed to load services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Загрузка покупленных услуг - теперь запрашиваем свежее gameState
  // Проверка cooldown для услуги
  const getServiceCooldown = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.cooldown_days || service.cooldown_days === 0) {
      return { isOnCooldown: false, remainingTime: 0, canPurchase: true };
    }
    
    const userService = userServices.find(us => us.service_id === serviceId);
    if (!userService || !userService.purchased_at) {
      return { isOnCooldown: false, remainingTime: 0, canPurchase: true };
    }
    
    const purchasedAt = new Date(userService.purchased_at);
    const cooldownMs = service.cooldown_days * 24 * 60 * 60 * 1000;
    const nextAvailableAt = new Date(purchasedAt.getTime() + cooldownMs);
    const now = new Date();
    
    if (now >= nextAvailableAt) {
      return { isOnCooldown: false, remainingTime: 0, canPurchase: true };
    }
    
    const remainingMs = nextAvailableAt.getTime() - now.getTime();
    return {
      isOnCooldown: true,
      remainingTime: remainingMs,
      nextAvailableAt: nextAvailableAt,
      canPurchase: false
    };
  };

  const loadUserServices = async () => {
    try {
      // Просто запрашиваем свежее состояние которое включает user_services
      const gameStateData = await API.getGameState();
      
      // Обновляем активные бусты из gameState
      if (gameStateData && gameStateData.activeBoosts && gameStateData.activeBoosts.length > 0) {
        const activeBoost = gameStateData.activeBoosts[0]; // берем первый активный буст
        setActiveBonus({
          multiplier: activeBoost.multiplier,
          expiresAt: new Date(activeBoost.endsAt).getTime(),
          remainingSeconds: activeBoost.remainingSeconds,
        });
      } else {
        setActiveBonus(null);
      }
      
      if (gameStateData && gameStateData.user_services) {
        setUserServices(gameStateData.user_services);
        return gameStateData.user_services;
      } else {
        setUserServices([]);
        return [];
      }
    } catch (error) {
      console.error('[GameContext] Failed to load user services:', error);
      setUserServices([]);
      return [];
    }
  };

  // Загрузка улучшений пользователя
  const loadUserUpgrades = async () => {
    try {
      const data = await API.getUserUpgrades();
      // Обработка ответа сервера - может быть в формате {data: [...]} или [...]
      let userUpgradesList = [];
      if (Array.isArray(data)) {
        userUpgradesList = data;
      } else if (data && Array.isArray(data.data)) {
        userUpgradesList = data.data;
      } else if (data && data.upgrades && Array.isArray(data.upgrades)) {
        userUpgradesList = data.upgrades;
      }
      setUserUpgrades(userUpgradesList);
      return userUpgradesList; // Возвращаем загруженный список
    } catch (error) {
      console.error('[GameContext] Failed to load user upgrades:', error);
      setUserUpgrades([]);
      return []; // Возвращаем пустой массив при ошибке
    }
  };

  // Загрузка ежедневных задач
  const loadDailyTasks = async () => {
    try {
      setLoadingTasks(true);
      const data = await API.getDailyTasks();

      // Обработка ответа сервера
      let tasksList = [];
      if (Array.isArray(data)) {
        tasksList = data;
      } else if (data && Array.isArray(data.data)) {
        tasksList = data.data;
      } else if (data && data.tasks && Array.isArray(data.tasks)) {
        tasksList = data.tasks;
      }
      
      setDailyTasks(tasksList);
      
      // Загружаем счетчики рефералов для заданий
      await loadTaskReferralCounts();
    } catch (error) {
      console.error('[GameContext] Failed to load daily tasks:', error);
      setDailyTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Загрузка еженедельных задач
  const loadWeeklyTasks = async () => {
    try {
      const data = await API.getWeeklyTasks();
      // Обработка ответа сервера
      let tasksList = [];
      if (Array.isArray(data)) {
        tasksList = data;
      } else if (data && Array.isArray(data.data)) {
        tasksList = data.data;
      } else if (data && data.tasks && Array.isArray(data.tasks)) {
        tasksList = data.tasks;
      }
      
      setWeeklyTasks(tasksList);
      
      // NOTE: currentLoginStreak берется из loadLoginRewards(), не из задач
      // Задача "Сыграй 7 дней" показывает прогресс, но не является источником streak
      
      // Загружаем счетчики рефералов для заданий
      await loadTaskReferralCounts();
    } catch (error) {
      console.error('[GameContext] Failed to load weekly tasks:', error);
      setWeeklyTasks([]);
    }
  };

  // Периодическая синхронизация задач с сервером (раз в 3 секунды)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDailyTasks();
      loadWeeklyTasks();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Загрузка награды за вход
  const loadLoginRewards = async () => {
    try {
      const response = await API.getLoginRewards?.();
      if (response) {
        // Обработка ответа сервера
        let rewardsList = [];
        let currentStreak = 0;
        if (response.data && Array.isArray(response.data.rewards)) {
          rewardsList = response.data.rewards;
          currentStreak = response.data.current_streak || 0;
        } else if (Array.isArray(response.data)) {
          rewardsList = response.data;
        } else if (Array.isArray(response.rewards)) {
          rewardsList = response.rewards;
          currentStreak = response.current_streak || 0;
        }
        
        setLoginRewards(rewardsList);
        setCurrentLoginStreak(currentStreak);
      }
    } catch (error) {
      console.error('[GameContext] Failed to load login rewards:', error);
      // Не критично если награды не загружены
    }
  };

  // Завершение weekly quest с разблокировкой Background 3
  const completeWeeklyTask = async (taskId) => {
    try {
      // Еженедельные задачи используют тот же эндпоинт что и ежедневные
      const result = await API.claimTaskReward(taskId);
      
      if (result?.success || result?.data?.success) {
        // Разблокируем Background 3 если Background 2 уже разблокирован
        if (unlockedBackgrounds.has(2)) {
          setUnlockedBackgrounds(prev => new Set([...prev, 3]));
        }
        
        // Перезагружаем задачи
        await loadWeeklyTasks();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to complete weekly task:', error);
      return false;
    }
  };

  // Функция для вычисления суммарного бонуса монет при клике от всех купленных апгрейдов
  const calculateTotalCoinsPerClick = (allUpgrades, allUserUpgrades) => {
    if (!Array.isArray(allUpgrades) || !Array.isArray(allUserUpgrades)) {
      return 1; // базовый бонус
    }
    
    let totalBonus = 1; // базовый бонус = 1
    
    allUserUpgrades.forEach(userUpgrade => {
      // Находим соответствующий апгрейд по upgrade_id
      const upgradeData = allUpgrades.find(u => u.id === userUpgrade.upgrade_id);
      if (upgradeData && upgradeData.base_value) {
        const bonus = parseFloat(upgradeData.base_value) || 0;
        totalBonus += bonus;
      }
    });
    
    return totalBonus;
  };

  // Загрузка состояния игры с сервера
  const loadGameState = (serverData) => {
    if (serverData.user) {
      // Структура ответа с сервера: { user: {...}, ... }
      const user = serverData.user;
      setUser(user); // Сохраняем user для использования в других компонентах
      if (user.coins !== undefined) setCoins(Number(user.coins));
      if (user.energy !== undefined) setEnergy(Number(user.energy));
      if (user.max_energy !== undefined) setMaxEnergy(Number(user.max_energy));
      if (user.level !== undefined) {
        setLevel(Number(user.level));
        setExpRequired(calculateExpRequired(Number(user.level)));
      }
      if (user.experience !== undefined && user.level !== undefined) {
        const expForCurrentLevel = calculateExpForCurrentLevel(Number(user.experience), Number(user.level));
        setExpCurrent(Math.max(0, expForCurrentLevel));
      }
      if (user.energy_regen_rate !== undefined) setEnergyRegenRate(Number(user.energy_regen_rate));
      if (user.coins_per_click !== undefined) setCoinsPerClick(Number(user.coins_per_click));
      if (user.base_coins_per_click !== undefined) setBaseCoinsPerClick(Number(user.base_coins_per_click));
    } else {
      // Структура может быть плоская
      if (serverData.coins !== undefined) setCoins(Number(serverData.coins));
      if (serverData.energy !== undefined) setEnergy(Number(serverData.energy));
      if (serverData.max_energy !== undefined) setMaxEnergy(Number(serverData.max_energy));
      if (serverData.level !== undefined) {
        setLevel(Number(serverData.level));
        setExpRequired(calculateExpRequired(Number(serverData.level)));
      }
      if (serverData.experience !== undefined && serverData.level !== undefined) {
        const expForCurrentLevel = calculateExpForCurrentLevel(Number(serverData.experience), Number(serverData.level));
        setExpCurrent(Math.max(0, expForCurrentLevel));
      }
      if (serverData.energy_regen_rate !== undefined) setEnergyRegenRate(Number(serverData.energy_regen_rate));
      if (serverData.coins_per_click !== undefined) setCoinsPerClick(Number(serverData.coins_per_click));
      if (serverData.base_coins_per_click !== undefined) setBaseCoinsPerClick(Number(serverData.base_coins_per_click));
    }
    
    // Загружаем покупенные услуги если они есть в ответе сервера
    if (serverData.user_services && Array.isArray(serverData.user_services)) {
      setUserServices(serverData.user_services);
    }
    
    // Загружаем активные бусты если они есть в ответе сервера
    if (serverData.activeBoosts && Array.isArray(serverData.activeBoosts)) {
      // КРИТИЧЕСКИ: Отфильтровываем уже истекшие бусты (remainingSeconds <= 0)
      const validBoosts = serverData.activeBoosts.filter(boost => {
        const remainingSeconds = boost.remainingSeconds || (new Date(boost.endsAt).getTime() - Date.now()) / 1000;
        return remainingSeconds > 0;
      });
      
      if (validBoosts.length > 0) {
        const activeBoost = validBoosts[0]; // берем первый активный буст
        const bonus = {
          type: activeBoost.type || 'tap_multiplier',
          multiplier: activeBoost.multiplier,
          expiresAt: new Date(activeBoost.endsAt).getTime(),
          remainingSeconds: activeBoost.remainingSeconds,
        };
        setActiveBonus(bonus);
      } else {
        setActiveBonus(null);
      }
    } else {
      setActiveBonus(null);
    }
    
    // Загружаем данные разблокировок с сервера
    if (serverData.unlocked_characters && Array.isArray(serverData.unlocked_characters)) {
      setUnlockedCharacters(new Set(serverData.unlocked_characters));
      setPurchasedUpgrades(prev => {
        const newSet = new Set(prev);
        if (serverData.unlocked_characters.includes(2)) newSet.add(5); // Персонаж 2 разблокирован → upgrade 5 куплен
        return newSet;
      });
    }
    if (serverData.unlocked_teeth && Array.isArray(serverData.unlocked_teeth)) {
      setUnlockedTeeth(new Set(serverData.unlocked_teeth));
      // Если зуб 2 разблокирован → upgrade 2 куплен
      if (serverData.unlocked_teeth.includes(2)) {
        setPurchasedUpgrades(prev => new Set([...prev, 2]));
        setLoginStreakStartedAfterTooth2(true);
      }
      // Если зуб 3 разблокирован → upgrade 5 куплен
      if (serverData.unlocked_teeth.includes(3)) {
        setPurchasedUpgrades(prev => new Set([...prev, 5]));
      }
    }
    if (serverData.unlocked_backgrounds && Array.isArray(serverData.unlocked_backgrounds)) {
      setUnlockedBackgrounds(new Set(serverData.unlocked_backgrounds));
    }
    if (serverData.invited_friends_count !== undefined) {
      setInvitedFriendsCount(Number(serverData.invited_friends_count));
    }
    if (serverData.login_streak_started_after_tooth2 !== undefined) {
      setLoginStreakStartedAfterTooth2(serverData.login_streak_started_after_tooth2);
    }
    // NOTE: current_login_streak берется из loadLoginRewards(), не из game state
    // Game state может содержать устаревшее значение
  };

  // Обработка реферального кода при первом входе
  useEffect(() => {
    const processReferralCode = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        const startParam = tg?.initDataUnsafe?.start_param;
        
        // Проверяем наличие реферального кода
        if (startParam && startParam.startsWith('ref_')) {
          const userId = tg?.initDataUnsafe?.user?.id?.toString();
          if (!userId) return;
          
          console.log(`[GameContext] Processing referral code: ${startParam}`);
          
          // Отправляем на backend для регистрации
          try {
            const response = await API.apiRequest('/referral/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                referralCode: startParam
              })
            });
            
            if (response?.success) {
              // Перезагружаем счетчик друзей
              await loadInvitedFriendsCount();
            }
          } catch (error) {
            console.error('[GameContext] Failed to register referral:', error);
          }
        }
      } catch (error) {
        console.error('[GameContext] Error processing referral code:', error);
      }
    };
    
    // Обрабатываем реферальный код только один раз при загрузке
    processReferralCode();
  }, []); // Пустой массив зависимостей - выполняется только один раз

  // Инициализация WebSocket соединения и слушателей
  useEffect(() => {
    const initSocket = async () => {
      // Небольшая задержка чтобы убедиться что токен загружен
      setTimeout(() => {
        API.initializeWebSocket(
          (message) => {
            // Обрабатываем разные типы сообщений от сервера
            if (message.type === 'game:state') {
              loadGameState(message.data);
            } else if (message.type === 'energy:update') {
              if (message.data.energy !== undefined) {
                setEnergy(message.data.energy);
              }
            } else if (message.type === 'autoclicker:earnings') {
              // Обновляем коины от автокликера
              if (message.data.coins !== undefined) {
                setCoins(Number(message.data.coins));
              }
            } else if (message.type === 'game:click:result') {
              // Обновляем коины и энергию с сервера для синхронизации
              // Опыт НЕ обновляем, т.к. уже добавили его локально с множителем
              if (message.data.coins !== undefined) {
                setCoins(Number(message.data.coins));
              }
              if (message.data.energy !== undefined) {
                setEnergy(message.data.energy);
              }
              
              // КРИТИЧНО: Обновляем activeBonus по currentMultiplier из ответа сервера
              if (message.data.currentMultiplier !== undefined) {
                if (message.data.currentMultiplier > 1) {
                  // Если есть мультиплаер, устанавливаем активный бонус
                  setActiveBonus(prev => ({
                    ...(prev || {}),
                    multiplier: message.data.currentMultiplier,
                    type: prev?.type || 'tap_multiplier'
                  }));
                } else {
                  // Если мультиплаер = 1, то нет активного бонуса
                  setActiveBonus(null);
                }
              }
            } else if (message.type === 'task:completed') {
              // Задача завершена - перезагружаем список задач
              loadDailyTasks();
              loadWeeklyTasks();
            } else if (message.type === 'task:claimed') {
              // Награда заклеймена - обновляем коины и перезагружаем задачи
              if (message.data.reward_coins !== undefined) {
                setCoins(prev => prev + Number(message.data.reward_coins));
              }
              loadDailyTasks();
              loadWeeklyTasks();
            }
          },
          (error) => {
            console.error('[GameContext] WebSocket error:', error);
          }
        );
        
        // Загружаем улучшения и сервисы после установления соединения
        loadUpgrades();
        loadServices();
        loadUserUpgrades();
        loadDailyTasks();
        loadWeeklyTasks();
        loadLoginRewards();
        
        // Явно загружаем статус автокликера
        fetchAutoClickerStatus().catch(err => console.error('[GameContext] Failed to fetch auto-clicker status in init:', err));
      }, 1000);
    };

    initSocket();

    // Cleanup при размонтировании
    return () => {
      // Отправляем оставшиеся клики перед отключением
      if (clickBatchRef.current.clicks > 0) {
        API.sendWebSocketMessage('game:click', {
          clicks: clickBatchRef.current.clicks,
          timestamps: clickBatchRef.current.timestamps,
          coinsPerClick: baseCoinsPerClick // Отправляем текущий бонус за клик
        });
      }
      
      // Очищаем таймаут
      if (clickBatchTimeoutRef.current) {
        clearTimeout(clickBatchTimeoutRef.current);
      }
      
      API.closeWebSocket();
    };
  }, []);

  // Синхронизация purchasedUpgrades с userUpgrades и пересчёт базовых монет
  useEffect(() => {
    if (Array.isArray(userUpgrades) && userUpgrades.length > 0) {
      const upgradePurchaseIds = new Set(userUpgrades.map(u => u.upgrade_id));
      setPurchasedUpgrades(upgradePurchaseIds);
    }
    
    // Пересчитываем baseCoinsPerClick когда загружаются apgrades
    if (upgrades && upgrades.length > 0 && userUpgrades && userUpgrades.length >= 0) {
      const totalCoins = calculateTotalCoinsPerClick(upgrades, userUpgrades);
      setBaseCoinsPerClick(totalCoins);
    }
  }, [userUpgrades, upgrades]);

  // ========== ПРОВЕРКИ ДЛЯ УВЕДОМЛЕНИЙ В ФУТЕРЕ ==========
  
  // Проверка наличия доступных апгрейдов (можно купить)
  const hasAvailableUpgrades = () => {
    // Проверяем обычные апгрейды
    const hasRegularUpgrade = upgrades && upgrades.length > 0 && upgrades.some(upgrade => {
      if (purchasedUpgrades.has(upgrade.id)) return false;
      if (coins < upgrade.base_cost) return false;
      return canPurchaseUpgrade(upgrade.id);
    });
    
    // Проверяем автокликер
    const nextAutoClickerLevel = (autoClickerStatus?.level || 0) + 1;
    const hasAutoClicker = nextAutoClickerLevel <= 5 && 
      autoClickerStatus?.next_level_config &&
      coins >= autoClickerStatus.next_level_config.cost &&
      canPurchaseAutoClicker(nextAutoClickerLevel);
    
    return hasRegularUpgrade || hasAutoClicker;
  };

  // Проверка наличия доступных услуг (можно купить)
  const hasAvailableServices = () => {
    if (!services || services.length === 0) return false;
    
    const available = services.filter(service => {
      // Проверяем cooldown (если куплена и на cooldown - недоступна)
      const cooldownInfo = getServiceCooldown(service.id);
      if (cooldownInfo.isOnCooldown) return false;
      
      // Проверяем достаточно ли монет
      if (coins < service.cost) return false;
      
      // Проверяем разблокирован ли сервис
      // Скидка 30% требует 30 друзей
      if (service.id === '19a82336-1564-4080-abdd-069771d8417a' && invitedFriendsCount < 30) return false;
      // Бесплатная чистка требует Background 2  
      if (service.id === 'c51c9b1d-f4e3-4f6d-a5e1-7666706311f6' && !unlockedBackgrounds.has(2)) return false;
      
      return true;
    });
    
    return available.length > 0;
  };

  // Проверка наличия доступных заданий (можно забрать награду)
  const hasAvailableTasks = () => {
    // Проверяем ежедневные задания
    const hasCompletedDaily = dailyTasks.some(task => 
      task.completed && !task.claimed
    );
    
    // Проверяем еженедельные задания
    const hasCompletedWeekly = weeklyTasks.some(task => 
      task.completed && !task.claimed
    );
    
    // Проверяем награды за вход
    const hasClaimableLogin = loginRewards.some(reward => 
      reward.day === currentLoginStreak && !reward.claimed && !reward.claimed_today
    );
    
    return hasCompletedDaily || hasCompletedWeekly || hasClaimableLogin;
  };

  // ========== ЗАГЛУШКИ ДЛЯ УДАЛЁННЫХ СВОЙСТВ ==========
  // Эти свойства удалены из GameContext в процессе очистки,
  // но компоненты их ещё используют. Добавляем заглушки.
  
  const addCoins = (amount) => {
    // КРИТИЧЕСКИ ВАЖНО: Конвертируем amount в число во время вызова
    const numAmount = Number(amount);
    
    if (isNaN(numAmount)) {
      console.error('[GameContext] ERROR: amount cannot be converted to number! amount =', amount, 'type =', typeof amount);
      return;
    }
    
    setCoins(prev => {
      // Убеждаемся что prev это число
      const prevNum = Number(prev);
      if (isNaN(prevNum)) {
        console.error('[GameContext] ERROR: prev is NaN! prev =', prev, 'type =', typeof prev);
        return prevNum;
      }
      const newCoins = Math.max(0, prevNum + numAmount);
      return newCoins;
    });
  };

  const purchasedCharacter3 = unlockedCharacters.has(3);
  
  const purchaseUpgrade = async (upgradeId) => {
    try {
      // Проверяем, может ли игрок купить этот апгрейд
      if (!canPurchaseUpgrade(upgradeId)) {
        return false;
      }
      
      // Получаем стоимость апгрейда ДО покупки
      const upgradeData = upgrades.find(u => u.id === upgradeId);
      const upgradeCost = upgradeData?.base_cost || 0;
      
      const result = await API.purchaseUpgrade(upgradeId);
      
      if (result?.success || result?.data?.success) {
        // КРИТИЧЕСКИ ВАЖНО: вычитаем монеты сразу после успешной покупки
        setCoins(prev => {
          const newCoins = prev - upgradeCost;
          return newCoins;
        });
        
        // Добавляем апгрейд в локальный Set
        setPurchasedUpgrades(prev => new Set([...prev, upgradeId]));
        
        // Обновляем разблокировки на основе индекса апгрейда
        const upgradeIndex = upgrades.findIndex(u => u.id === upgradeId);
        
        // Индекс 1 (2-й апгрейд) - разблокирует зуб 2
        if (upgradeIndex === 1) {
          setUnlockedTeeth(prev => new Set([...prev, 2]));
          setLoginStreakStartedAfterTooth2(true);
        }
        
        // Индекс 4 (5-й апгрейд) - разблокирует персонажа 2 и зуб 3
        if (upgradeIndex === 4) {
          setUnlockedCharacters(prev => new Set([...prev, 2]));
          setUnlockedTeeth(prev => new Set([...prev, 3]));
        }
        
        // Перезагружаем базовые монеты за клик
        const updatedUserUpgrades = await loadUserUpgrades();
        const totalCoins = calculateTotalCoinsPerClick(upgrades, updatedUserUpgrades);
        setBaseCoinsPerClick(totalCoins);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to purchase upgrade:', error);
      return false;
    }
  };

  // ========== AUTO-CLICKER METHODS ==========
  
  const fetchAutoClickerStatus = async () => {
    try {
      const response = await API.getAutoClickerStatus();
      if (response?.data) {
        setAutoClickerStatus(response.data);
        
        // Синхронизируем локальные покупленные уровни
        if (response.data.level && response.data.level > 0) {
          const levels = new Set();
          for (let i = 1; i <= response.data.level; i++) {
            levels.add(i);
          }
          setPurchasedAutoClickerLevels(levels);
        }
        
        return response.data;
      }
    } catch (error) {
      console.error('[GameContext] Failed to fetch auto-clicker status:', error);
    }
    return null;
  };

  const purchaseAutoClickerLevel = async () => {
    try {
      const nextLevel = (autoClickerStatus?.level || 0) + 1;
      
      // Проверяем, может ли игрок купить этот уровень
      if (!canPurchaseAutoClicker(nextLevel)) {
        return false;
      }
      
      // Получаем стоимость уровня ДО покупки
      const levelConfig = autoClickerConfig.find(c => c.level === nextLevel);
      const levelCost = levelConfig?.cost || 0;
      
      const result = await API.purchaseAutoClickerLevel();
      
      if (result?.success) {
        // КРИТИЧЕСКИ ВАЖНО: вычитаем монеты сразу после успешной покупки
        setCoins(prev => {
          const newCoins = prev - levelCost;
          return newCoins;
        });
        
        // Добавляем уровень в локальный Set
        setPurchasedAutoClickerLevels(prev => new Set([...prev, nextLevel]));
        
        // Персонаж 3 НЕ разблокируется покупкой автокликера уровень 4!
        // Персонаж 3 разблокируется: 1) покупкой за 1кк монет, 2) приглашением 7 друзей
        
        // Обновляем статус сразу из ответа сервера
        if (result.data?.new_level && result.data?.coins_per_hour) {
          setAutoClickerStatus({
            level: result.data.new_level,
            is_active: result.data.new_level > 0,
            coins_per_hour: result.data.coins_per_hour,
            offline_seconds: 0,
            offline_earnings: 0,
            current_config: null,
            next_level_config: null,
          });
        }
        
        // Перезагружаем полный статус с сервера для всех данных
        await fetchAutoClickerStatus();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to purchase auto-clicker level:', error);
      return false;
    }
  };

  const purchaseAutoClicker = purchaseAutoClickerLevel;
  
  const purchaseCharacter3 = async (cost) => {
    try {
      // Проверяем предварительные условия
      if (!unlockedCharacters.has(2)) {
        return false;
      }
      
      if (coins < cost) {
        return false;
      }
      
      if (unlockedCharacters.has(3)) {
        return false;
      }
      
      const result = await API.purchaseCharacter3(cost);
      
      if (result?.success || result?.data?.success) {
        // Вычитаем монеты и разблокируем персонажа
        setCoins(prev => prev - cost);
        setUnlockedCharacters(prev => new Set([...prev, 3]));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to purchase character 3:', error);
      return false;
    }
  };
  
  const inviteFriend = async () => {
    try {
      // Получаем Telegram WebApp API
      const tg = window.Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      
      if (!userId) {
        console.error('[GameContext] User ID not found');
        return false;
      }
      
      // Получаем реферальную ссылку с сервера
      const result = await API.getReferralLink(userId);
      
      if (result?.success && result?.referralLink) {
        const referralLink = result.referralLink;
        const shareText = `Присоединяйся к игре OMCIP! 🦷\n\nИспользуй мою реферальную ссылку:`;
        
        // Открываем Telegram share dialog
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
        
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(shareUrl);
        } else if (tg?.openLink) {
          tg.openLink(shareUrl);
        } else {
          // Fallback - открываем в новом окне
          window.open(shareUrl, '_blank');
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to invite friend:', error);
      return false;
    }
  };

  // Покупка сервиса
  const purchaseService = async (serviceId, cost) => {
    try {
      // Проверяем доступность сервиса
      // Бесплатная чистка требует Background 2
      if (serviceId === 'c51c9b1d-f4e3-4f6d-a5e1-7666706311f6' && !canAccessService4()) {
        return false;
      }
      
      // Скидка 30% требует 30 друзей
      if (serviceId === '19a82336-1564-4080-abdd-069771d8417a' && !canAccessService3()) {
        return false;
      }
      
      // Проверяем наличие монет
      if (coins < cost) {
        return false;
      }
      
      const result = await API.purchaseService?.(serviceId, cost);
      
      if (result?.success || result?.data?.success) {
        // Вычитаем монеты
        setCoins(prev => prev - cost);
        
        // Обновляем список купленных сервисов
        await loadUserServices();
        
        // Показываем Toast с уведомлением о покупке
        const service = services.find(s => s.id === serviceId);
        if (service) {
          setPurchaseToast({
            serviceName: service.name,
            cost: cost
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] Failed to purchase service:', error);
      return false;
    }
  };
  
  const canPurchaseUpgrade = (upgradeId) => {
    // Если уже куплено, нельзя купить снова
    if (purchasedUpgrades.has(upgradeId)) {
      return false;
    }
    
    // Найдем индекс этого апгрейда в списке
    const upgradeIndex = upgrades.findIndex(u => u.id === upgradeId);
    
    // Если это первый апгрейд (индекс 0), он всегда доступен
    if (upgradeIndex === 0) {
      return true;
    }
    
    // Если это седьмой апгрейд (Ассистент, индекс 6), требуется автокликер уровень 5 И предыдущий апгрейд
    if (upgradeIndex === 6) {
      const autoClickerEnough = autoClickerStatus?.level >= 5;
      const hasPrevious = purchasedUpgrades.has(upgrades[5]?.id);
      const canPurchase = autoClickerEnough && hasPrevious;
      return canPurchase;
    }
    
    // Если это пятый апгрейд (индекс 4), требуется персонаж 2
    if (upgradeIndex === 4) {
      const canPurchase = purchasedUpgrades.has(upgrades[3]?.id) && unlockedCharacters.has(2);
      return canPurchase;
    }
    
    // Для остальных требуется предыдущий апгрейд
    if (upgradeIndex > 0) {
      const previousUpgradeId = upgrades[upgradeIndex - 1]?.id;
      const canPurchase = purchasedUpgrades.has(previousUpgradeId);
      return canPurchase;
    }
    
    return false;
  };

  const canPurchaseAutoClicker = (level) => {
    if (level === 4) {
      // Автокликер уровень 4 требует персонажа 3 (разблокируется покупкой за 1кк или приглашением 7 друзей)
      return !purchasedAutoClickerLevels.has(level) && purchasedAutoClickerLevels.has(3) && unlockedCharacters.has(3);
    }
    if (level === 1) {
      return !purchasedAutoClickerLevels.has(level);
    }
    return !purchasedAutoClickerLevels.has(level) && purchasedAutoClickerLevels.has(level - 1);
  };
  
  const getUpgradeLockReason = (upgradeId) => {
    // Найдем индекс этого апгрейда
    const upgradeIndex = upgrades.findIndex(u => u.id === upgradeId);
    
    // Для 7-го апгрейда (Ассистент, индекс 6)
    if (upgradeIndex === 6) {
      const autoClickerEnough = autoClickerStatus?.level >= 5;
      const hasPrevious = purchasedUpgrades.has(upgrades[5]?.id);
      
      if (!autoClickerEnough) {
        return "Купите автокликер ур. 5";
      }
      if (!hasPrevious) {
        const previousUpgrade = upgrades[5];
        return `Купите ${previousUpgrade?.name || "пред. апгрейд"}`;
      }
    }
    
    // Для 5-го апгрейда (индекс 4)
    if (upgradeIndex === 4 && !unlockedCharacters.has(2)) {
      return "Разблокируйте персонажа 2";
    }
    
    // Для остальных не первых апгрейдов
    if (upgradeIndex > 0 && !canPurchaseUpgrade(upgradeId) && !purchasedUpgrades.has(upgradeId)) {
      const previousIndex = upgradeIndex - 1;
      const previousUpgrade = upgrades[previousIndex];
      return `Купите ${previousUpgrade?.name || "пред. апгрейд"}`;
    }
    
    return null;
  };

  const getAutoClickerLockReason = (level) => {
    if (level === 4 && !unlockedCharacters.has(3)) {
      return "Требуется Персонаж 3";
    }
    if (!canPurchaseAutoClicker(level) && !purchasedAutoClickerLevels.has(level)) {
      return "Купите пред. уровень";
    }
    return null;
  };
  
  // ========== ПРОВЕРКИ ДЛЯ СЕРВИСОВ ==========
  
  // Проверка: доступен ли Service 4 (требует Background 2)
  const canAccessService4 = () => unlockedBackgrounds.has(2);
  
  // Получить причину блокировки Service 4
  const getService4LockReason = () => {
    if (!unlockedBackgrounds.has(2)) {
      return "Требует фон 2 (разблокируется в день 7 login streak)";
    }
    return null;
  };
  
  // Проверка: доступен ли Service 3 (требует 30 друзей)
  const canAccessService3 = () => invitedFriendsCount >= 30;
  
  // Получить причину блокировки Service 3
  const getService3LockReason = () => {
    if (invitedFriendsCount < 30) {
      return `Пригласите еще ${30 - invitedFriendsCount} друзей`;
    }
    return null;
  };

  // ========== LOGIN REWARDS ==========

  const claimLoginReward = async (day) => {
    try {
      const response = await API.claimLoginReward(day);
      
      if (response.success || response.data?.success) {
        // Обновляем coins если это coin reward
        if (response.data?.reward_coins) {
          addCoins(Number(response.data.reward_coins));
        }
        
        // Разблокируем Background 2 если это день 7
        if (day === 7 && !unlockedBackgrounds.has(2)) {
          setUnlockedBackgrounds(prev => new Set([...prev, 2]));
        }
        
        // Перезагружаем rewards для обновления состояния
        await loadLoginRewards();
        
        // Перезагружаем game state (включая activeBoosts для бустов)
        const gameStateData = await API.getGameState();
        if (gameStateData && gameStateData.data) {
          await loadGameState(gameStateData.data);
        }
        
        return response.data;
      }
      
      throw new Error('Failed to claim reward');
    } catch (error) {
      console.error('[GameContext] Failed to claim login reward:', error);
      throw error;
    }
  };
  
  const autoClickerConfig = [
    { name: "Автокликер Уровень 1", level: 1, cost: 10000, coinsPerHour: 1000 },
    { name: "Автокликер Уровень 2", level: 2, cost: 96000, coinsPerHour: 1500 },
    { name: "Автокликер Уровень 3", level: 3, cost: 252000, coinsPerHour: 2500 },
    { name: "Автокликер Уровень 4", level: 4, cost: 660000, coinsPerHour: 4000 },
    { name: "Автокликер Уровень 5", level: 5, cost: 1536000, coinsPerHour: 6000 },
  ];

  // КРИТИЧНО: useEffect для вычисления и обновления autoClickerIncome при изменении autoClickerStatus
  useEffect(() => {
    if (!autoClickerStatus?.level || autoClickerStatus.level === 0) {
      setAutoClickerIncomeValue(0);
      return;
    }
    
    // Суммируем доход от всех уровней с 1 по текущий
    let totalIncome = 0;
    for (let i = 1; i <= autoClickerStatus.level; i++) {
      const levelConfig = autoClickerConfig[i - 1]; // i-1 потому что массив индексируется с 0
      if (levelConfig) {
        totalIncome += levelConfig.coinsPerHour;
      }
    }
    
    setAutoClickerIncomeValue(totalIncome);
  }, [autoClickerStatus]);

  // КРИТИЧНО: useEffect для вычисления и обновления totalCoinsPerHour при изменении autoClickerIncomeValue
  useEffect(() => {
    const pasiveIncome = 0; // TODO: получить с сервера
    const newTotal = pasiveIncome + autoClickerIncomeValue;
    
    setTotalCoinsPerHourValue(newTotal);
  }, [autoClickerIncomeValue]);

  // Вспомогательные функции для обратной совместимости (на случай если другой код их вызывает)
  const autoClickerIncome = () => autoClickerIncomeValue;
  const totalCoinsPerHour = () => totalCoinsPerHourValue;

  // Проверка условий разблокировки апгрейда
  const checkUnlockConditions = (upgrade) => {
    if (!upgrade) return { isLocked: false, reason: null };

    // Проверка уровня
    if (upgrade.level_requirement && level < upgrade.level_requirement) {
      return {
        isLocked: true,
        reason: `Требуется ${upgrade.level_requirement} уровень`
      };
    }

    // Проверка персонажа
    if (upgrade.character_requirement) {
      const characterId = parseInt(upgrade.character_requirement);
      if (!unlockedCharacters.has(characterId)) {
        return {
          isLocked: true,
          reason: `Требуется персонаж ${characterId}`
        };
      }
    }

    // Проверка дополнительных условий из unlock_conditions
    if (upgrade.unlock_conditions && typeof upgrade.unlock_conditions === 'object') {
      const conditions = upgrade.unlock_conditions;

      if (conditions.total_taps && totalTaps < conditions.total_taps) {
        return {
          isLocked: true,
          reason: `Требуется ${conditions.total_taps} тапов`
        };
      }

      if (conditions.coins && coins < conditions.coins) {
        return {
          isLocked: true,
          reason: `Требуется ${conditions.coins} монет`
        };
      }

      if (conditions.level && level < conditions.level) {
        return {
          isLocked: true,
          reason: `Требуется ${conditions.level} уровень`
        };
      }

      if (conditions.upgrades_count) {
        const upgradesCount = userUpgrades?.length || 0;
        if (upgradesCount < conditions.upgrades_count) {
          return {
            isLocked: true,
            reason: `Требуется ${conditions.upgrades_count} апгрейдов`
          };
        }
      }
    }

    return { isLocked: false, reason: null };
  };

  // ========== REFERRAL SYSTEM ==========
  // Загружаем количество приглашенных друзей из backend
  const loadInvitedFriendsCount = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      if (!userId) return;
      
      const response = await API.apiRequest(`/referral/stats/${userId}`);
      if (response.success) {
        setInvitedFriendsCount(response.totalReferrals);
      }
    } catch (error) {
      console.error('[GameContext] Failed to load invited friends count:', error);
    }
  };

  // Загружаем счетчики для заданий (daily/weekly)
  const loadTaskReferralCounts = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      if (!userId) return;
      
      const response = await API.getTaskReferralCounts(userId);
      if (response.success) {
        setDailyInvitedFriends(response.dailyInvitedFriends || 0);
        setWeeklyInvitedFriends(response.weeklyInvitedFriends || 0);
      }
    } catch (error) {
      console.error('[GameContext] Failed to load task referral counts:', error);
    }
  };

  // ========== ЭКСПОРТ КОНТЕКСТА ==========
  
  const value = {
    // User data
    user,
    
    // Основные параметры игры
    coins,
    level,
    energy,
    maxEnergy,
    coinsPerClick,
    baseCoinsPerClick,
    expCurrent,
    expRequired,
    
    // Вычисляемые доходы
    totalCoinsPerHour,
    autoClickerIncome,
    totalCoinsPerHourValue,
    autoClickerIncomeValue,
    
    // Визуальные элементы
    toothImage,
    background,
    character,
    userProfile,
    setUserProfile,
    updateVisuals,
    
    // Система бонусов
    activeBonus,
    activateTapBonus,
    
    // Механики игры
    handleClick,
    
    // Улучшения и сервисы
    upgrades,
    services,
    userUpgrades,
    userServices,
    loadingUpgrades,
    loadingServices,
    loadUpgrades,
    loadServices,
    loadUserUpgrades,
    loadUserServices,
    checkUnlockConditions,
    getServiceCooldown,
    
    // Задачи
    dailyTasks,
    weeklyTasks,
    loginRewards,
    loadingTasks,
    loadDailyTasks,
    loadWeeklyTasks,
    loadLoginRewards,
    claimLoginReward,
    completeWeeklyTask,
    
    // Auto-clicker
    autoClickerStatus,
    fetchAutoClickerStatus,
    purchaseAutoClickerLevel,
    
    // Проверки для UI
    hasAvailableUpgrades,
    hasAvailableServices,
    hasAvailableTasks,
    
    // Система разблокировок
    invitedFriendsCount,
    dailyInvitedFriends, // Для daily заданий (сбрасывается)
    weeklyInvitedFriends, // Для weekly заданий (сбрасывается)
    inviteFriend,
    loadInvitedFriendsCount, // Для обновления счетчика из компонентов
    loadTaskReferralCounts, // Для обновления task счетчиков
    totalTaps,
    unlockedBackgrounds,
    unlockedTeeth,
    unlockedCharacters,
    loginStreakStartedAfterTooth2,
    currentLoginStreak,
    
    // Покупки
    purchaseUpgrade,
    purchaseAutoClicker,
    purchaseCharacter3,
    purchaseService,
    canPurchaseUpgrade,
    canPurchaseAutoClicker,
    getUpgradeLockReason,
    getAutoClickerLockReason,
    autoClickerConfig,
    
    // Сервисы
    canAccessService4,
    getService4LockReason,
    canAccessService3,
    getService3LockReason,
    purchasedUpgrades,
    purchasedAutoClickerLevels,
    
    // Заглушки для удалённых свойств (TODO: интегрировать с сервером)
    addCoins,
    purchasedCharacter3,
    
    // Утилиты
    calculateExpRequired,
    calculateExpForCurrentLevel,
    loadGameState,
    apiRequest: API.apiRequest,
    
    // Загрузка данных для страниц
    loadDailyTasks,
    loadWeeklyTasks,
    loadLoginRewards,
    claimLoginReward,
  };

  // Загрузка апгрейдов с условиями разблокировки
  const loadUpgradesWithConditions = async () => {
    try {
      setLoadingUpgrades(true);
      const { upgrades } = await API.getUpgradesWithConditions();
      setUpgrades(upgrades);
    } catch (error) {
      console.error('[GameContext] Failed to load upgrades with conditions:', error);
    } finally {
      setLoadingUpgrades(false);
    }
  };

  useEffect(() => {
    loadUpgradesWithConditions();
  }, []);
  
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id?.toString();
    const startParam = tg?.initDataUnsafe?.start_param;
    
    // Загружаем количество друзей при старте
    loadInvitedFriendsCount();
    loadTaskReferralCounts(); // Загружаем счетчики для заданий
    
    if (!userId || !startParam) return;
    
    // Проверяем формат реферального кода
    if (startParam.startsWith('ref_')) {
      console.log('[GameContext] Processing referral code:', startParam);
      
      // Отправляем реферальный код на сервер
      API.apiRequest('/referral/register', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          referralCode: startParam
        })
      })
        .then(response => {
          if (response.success) {
            // Обновляем счетчики
            loadInvitedFriendsCount();
            loadTaskReferralCounts();
          }
        })
        .catch(error => {
          console.error('[GameContext] Error registering referral:', error);
        });
    }
  }, []); // Запускаем только один раз при монтировании

  // ========== WEBSOCKET INTEGRATION ==========
  useEffect(() => {
    // Получаем userId из Telegram WebApp или другого источника
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id?.toString();
    
    if (!userId) {
      return;
    }
    
    // Инициализируем WebSocket
    initWebSocket(userId);
    
    // Подписываемся на события покупки услуг
    const unsubscribe = onServicePurchased((data) => {
      // Обновляем список купленных услуг
      loadUserServices();
      
      // Показываем Toast если это не текущая вкладка
      // (для текущей вкладки Toast уже показан при покупке)
      const service = services.find(s => s.id === data.serviceId);
      if (service) {
        setPurchaseToast({
          serviceName: data.serviceName || service.name,
          cost: data.cost
        });
      }
    });
    
    // Cleanup при размонтировании
    return () => {
      unsubscribe();
      disconnectWebSocket();
    };
  }, [services]);

  return (
    <GameContext.Provider value={value}>
      {children}
      {purchaseToast && (
        <ServicePurchaseToast
          serviceName={purchaseToast.serviceName}
          cost={purchaseToast.cost}
          onClose={() => setPurchaseToast(null)}
        />
      )}
    </GameContext.Provider>
  );
};
