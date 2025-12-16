import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import Background1 from "../assets/images/background_lvl1.png"
import Background2 from "../assets/images/background_lvl2.png"
import Background3 from "../assets/images/background_lvl3.png"
import Tooth1 from "../assets/images/tooth1.png"
import Tooth2 from "../assets/images/tooth2.png"
import Tooth3 from "../assets/images/tooth3.png"
import Char1 from "../assets/images/char2.webm"
import Char2 from "../assets/images/char3.webm"
import Char3 from "../assets/images/char1.webm"
import * as API from "../utils/api";

export const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};

export const GameProvider = ({ children }) => {
  // Основные игровые параметры - инициализируем с дефолтными значениями
  // Сервер переинициализирует это в LoadingPage через loadGameState()
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(10000);
  const [baseCoinsPerClick, setBaseCoinsPerClick] = useState(1);
  const [coinsPerClick, setCoinsPerClick] = useState(1);
  
  // Батчинг для кликов (накопление и отправка пакетом)
  const clickBatchRef = useRef({ clicks: 0, timestamps: [] });
  const clickBatchTimeoutRef = useRef(null);
  
  // Активный бонус (отправляется сервером)
  const [activeBonus, setActiveBonus] = useState(null);
  
  // Визуальные элементы
  const [toothImage, setToothImage] = useState(Tooth1);
  const [background, setBackground] = useState(Background1);
  const [character, setCharacter] = useState(Char1);
  
  // Профиль пользователя
  const [userProfile, setUserProfile] = useState({
    name: "Игрок",
    photo: "/assets/images/profile-placeholder.png"
  });

  useEffect(() => {
    localStorage.setItem(INVITED_FRIENDS_KEY, invitedFriendsCount.toString());
  }, [invitedFriendsCount]);

  useEffect(() => {
    localStorage.setItem(UNLOCKED_BACKGROUNDS_KEY, JSON.stringify([...unlockedBackgrounds]));
  }, [unlockedBackgrounds]);

  useEffect(() => {
    localStorage.setItem(UNLOCKED_TEETH_KEY, JSON.stringify([...unlockedTeeth]));
  }, [unlockedTeeth]);

  useEffect(() => {
    localStorage.setItem(UNLOCKED_CHARACTERS_KEY, JSON.stringify([...unlockedCharacters]));
  }, [unlockedCharacters]);

  useEffect(() => {
    localStorage.setItem(PURCHASED_CHARACTER3_KEY, purchasedCharacter3.toString());
  }, [purchasedCharacter3]);

  // ========== СИСТЕМА БОНУСОВ ==========
  
  // Активация бонуса к тапам
  const activateTapBonus = (multiplier, durationMinutes) => {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    const bonus = {
      type: 'tap_multiplier',
      multiplier: multiplier,
      expiresAt: expiresAt,
      durationMinutes: durationMinutes
    };
    
    setActiveBonus(bonus);
    localStorage.setItem(ACTIVE_BONUS_KEY, JSON.stringify(bonus));
    
    // Пересчитываем coinsPerClick
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
          localStorage.removeItem(ACTIVE_BONUS_KEY);
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
  
  // Обновление coinsPerClick при изменении базового значения
  useEffect(() => {
    if (activeBonus && activeBonus.type === 'tap_multiplier') {
      setCoinsPerClick(baseCoinsPerClick * activeBonus.multiplier);
    } else {
      setCoinsPerClick(baseCoinsPerClick);
    }
  }, [baseCoinsPerClick, activeBonus]);

  // ========== СИСТЕМА ДРУЗЕЙ И РАЗБЛОКИРОВОК ==========

  const inviteFriend = () => {
    const newCount = invitedFriendsCount + 1;
    setInvitedFriendsCount(newCount);
    
    // Проверяем разблокировки при приглашении друзей
    if (newCount >= 1 && !unlockedCharacters.has(2)) {
      setUnlockedCharacters(prev => new Set([...prev, 2]));
    }
    if (newCount >= 3 && !unlockedTeeth.has(3)) {
      setUnlockedTeeth(prev => new Set([...prev, 3]));
    }
    if (newCount >= 7 && !unlockedCharacters.has(3)) {
      setUnlockedCharacters(prev => new Set([...prev, 3]));
      setPurchasedCharacter3(true);
    }
  };
  
  // ========== ЗАДАНИЯ И НАГРАДЫ ==========
  
  // Дефолтные конфигурации задач и наград (используются если сервер недоступен)
  const defaultDailyTasks = [
    { id: 1, title: "Сделай 100 тапов", reward: 1000, completed: false, claimed: false, type: "daily" },
    { id: 2, title: "Накопи 5000 зубкоинов", reward: 2000, completed: false, claimed: false, type: "daily" },
    { id: 3, title: "Купи любой апгрейд", reward: 1500, completed: false, claimed: false, type: "daily" },
  ];

  const defaultWeeklyTasks = [
    { id: 4, title: "Сыграй 7 дней без пропусков", reward: 70000, completed: false, claimed: false, type: "weekly", progress: 0, maxProgress: 7 },
    { id: 5, title: "Собери 100000 зубкоинов за неделю", reward: 50000, completed: false, claimed: false, type: "weekly", progress: 0, maxProgress: 7 },
  ];

  const defaultLoginRewards = [
    { day: 1, title: "1.000 зубкоинов", description: "Награда за первый день", type: "coins", value: 1000, claimed: false },
    { day: 2, title: "Бонус ×2 к тапам", description: "Действует 30 минут", type: "bonus", value: { multiplier: 2, duration: 30 }, claimed: false },
    { day: 3, title: "Сундук", description: "1.000–10.000 зубкоинов или бонус ×2 на 1 час", type: "chest", value: "small", claimed: false },
    { day: 4, title: "10.000 зубкоинов", description: "Награда за 4 дня подряд", type: "coins", value: 10000, claimed: false },
    { day: 5, title: "Бонус ×2 к тапам", description: "Действует 1 час", type: "bonus", value: { multiplier: 2, duration: 60 }, claimed: false },
    { day: 6, title: "Автовыполнение задания", description: "Одно ежедневное задание на выбор", type: "auto_complete", value: "daily", claimed: false },
    { day: 7, title: "Сундук", description: "10.000–20.000 зубкоинов, бонус ×2 на 3 часа или автовыполнение", type: "chest", value: "large", claimed: false },
  ];

  const loadSavedTasks = (key, initialTasks) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
    return initialTasks;
  };

  const [dailyTasks, setDailyTasks] = useState(() => loadSavedTasks(DAILY_TASKS_KEY, defaultDailyTasks));
  const [weeklyTasks, setWeeklyTasks] = useState(() => loadSavedTasks(WEEKLY_TASKS_KEY, defaultWeeklyTasks));
  const [loginRewards, setLoginRewards] = useState(() => loadSavedTasks(LOGIN_REWARDS_KEY, defaultLoginRewards));
  const [currentStreak, setCurrentStreak] = useState(() => {
    const saved = localStorage.getItem(LOGIN_STREAK_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Проверка входа и обновление стрика
  useEffect(() => {
    const checkLoginStreak = () => {
      const today = new Date().toDateString();
      const lastLogin = localStorage.getItem(LAST_LOGIN_DATE_KEY);

      if (lastLogin !== today) {
        const lastLoginDate = lastLogin ? new Date(lastLogin) : null;
        const todayDate = new Date();

        if (lastLoginDate) {
          const diffTime = todayDate - new Date(lastLogin);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Следующий день подряд
            const newStreak = currentStreak < 7 ? currentStreak + 1 : 1;
            setCurrentStreak(newStreak);
            localStorage.setItem(LOGIN_STREAK_KEY, newStreak.toString());
            
            if (newStreak === 1 && currentStreak === 7) {
              setLoginRewards(defaultLoginRewards);
              localStorage.setItem(LOGIN_REWARDS_KEY, JSON.stringify(defaultLoginRewards));
            }
          } else if (diffDays > 1) {
            // Пропуск - сброс
            setCurrentStreak(1);
            localStorage.setItem(LOGIN_STREAK_KEY, "1");
            setLoginRewards(defaultLoginRewards);
            localStorage.setItem(LOGIN_REWARDS_KEY, JSON.stringify(defaultLoginRewards));
          }
        } else {
          // Первый вход
          setCurrentStreak(1);
          localStorage.setItem(LOGIN_STREAK_KEY, "1");
        }

        localStorage.setItem(LAST_LOGIN_DATE_KEY, today);
      }
    };

    checkLoginStreak();
  }, []);

  // Сохранение заданий в localStorage
  useEffect(() => {
    localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  useEffect(() => {
    localStorage.setItem(WEEKLY_TASKS_KEY, JSON.stringify(weeklyTasks));
  }, [weeklyTasks]);

  useEffect(() => {
    localStorage.setItem(LOGIN_REWARDS_KEY, JSON.stringify(loginRewards));
  }, [loginRewards]);

  // Проверка выполнения заданий
  useEffect(() => {
    setDailyTasks(prev => prev.map(task => {
      if (task.claimed) return task;
      
      if (task.id === 1) {
        return { ...task, completed: totalTaps >= 100 };
      }
      if (task.id === 2) {
        return { ...task, completed: maxCoinsReached >= 5000 };
      }
      if (task.id === 3) {
        return { ...task, completed: upgradesPurchased >= 1 };
      }
      if (totalTaps >= 10000 && !unlockedCharacters.has(2)) {
        setUnlockedCharacters(prev => new Set([...prev, 2]));
      }
      return task;
    }));
  }, [totalTaps, maxCoinsReached, upgradesPurchased]);

  // Обработчики для заданий
  const handleClaimTaskReward = (task) => {
    if (task.completed && !task.claimed) {
      addCoins(task.reward);
      
      if (task.type === "daily") {
        setDailyTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, claimed: true } : t
        ));
      } else {
        setWeeklyTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, claimed: true } : t
        ));
      }
      return true;
    }
    return false;
  };

  const handleClaimLoginReward = (reward) => {
    if (reward.day !== currentStreak || reward.claimed) return false;

    let rewardMessage = "";
    if (currentStreak === 7) {
      setUnlockedBackgrounds(prev => new Set([...prev, 2]));
    }
    // Обработка разных типов наград
    if (reward.type === "coins") {
      addCoins(reward.value);
      rewardMessage = `Получено ${reward.value} зубкоинов`;
    } else if (reward.type === "bonus") {
      const bonus = activateTapBonus(reward.value.multiplier, reward.value.duration);
      rewardMessage = `Активирован бонус ×${reward.value.multiplier} к тапам на ${reward.value.duration} минут`;
    } else if (reward.type === "chest") {
      // Рандомная награда из сундука
      if (reward.value === "small") {
        const random = Math.random();
        if (random < 0.7) {
          const coinsAmount = Math.floor(Math.random() * 9000) + 1000;
          addCoins(coinsAmount);
          rewardMessage = `Из сундука выпало ${coinsAmount} зубкоинов`;
        } else {
          activateTapBonus(2, 60);
          rewardMessage = "Из сундука выпал бонус ×2 к тапам на 1 час";
        }
      } else if (reward.value === "large") {
        const random = Math.random();
        if (random < 0.5) {
          const coinsAmount = Math.floor(Math.random() * 10000) + 10000;
          addCoins(coinsAmount);
          rewardMessage = `Из сундука выпало ${coinsAmount} зубкоинов`;
        } else if (random < 0.8) {
          activateTapBonus(2, 180);
          rewardMessage = "Из сундука выпал бонус ×2 к тапам на 3 часа";
        } else {
          rewardMessage = "Из сундука выпало автовыполнение еженедельного задания";
        }
      }
    } else if (reward.type === "auto_complete") {
      rewardMessage = "Доступно автовыполнение задания";
    }

    // Помечаем награду как полученную
    setLoginRewards(prev => prev.map(r => 
      r.day === reward.day ? { ...r, claimed: true } : r
    ));
    
    return { success: true, message: rewardMessage };
  };

  // ========== КОНЕЦ СЕКЦИИ ЗАДАНИЙ ==========

  // Конфигурация автокликера - получаем с сервера или используем дефолт
  const autoClickerConfig = [
    { level: 1, coinsPerHour: 1000, cost: 10000, name: "Купить автокликер" },
    { level: 2, coinsPerHour: 1500, cost: 96000, name: "Автокликер уровень 2" },
    { level: 3, coinsPerHour: 2500, cost: 252000, name: "Автокликер уровень 3" },
    { level: 4, coinsPerHour: 4000, cost: 660000, name: "Автокликер уровень 4" },
    { level: 5, coinsPerHour: 6000, cost: 1536000, name: "Автокликер уровень 5" },
  ];

  // Максимальное время офлайн-заработка (5 часов в миллисекундах)
  const MAX_OFFLINE_HOURS = 5;
  const MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 60 * 60 * 1000;

  // Сохранение купленных апгрейдов
  useEffect(() => {
    localStorage.setItem(PURCHASED_UPGRADES_KEY, JSON.stringify([...purchasedUpgrades]));
  }, [purchasedUpgrades]);

  useEffect(() => {
    localStorage.setItem(PURCHASED_AUTOCLICKERS_KEY, JSON.stringify([...purchasedAutoClickerLevels]));
  }, [purchasedAutoClickerLevels]);

  // Установка coinsPerHour на основе уровня автокликера (суммирование всех купленных уровней)
  useEffect(() => {
    if (purchasedAutoClickerLevels.size > 0) {
      let totalCoinsPerHour = 0;
      
      purchasedAutoClickerLevels.forEach(level => {
        const config = autoClickerConfig.find(c => c.level === level);
        if (config) {
          totalCoinsPerHour += config.coinsPerHour;
        }
      });
      
      if (purchasedUpgrades.has(7)) {
        totalCoinsPerHour *= 1.5;
      }
      
      setCoinsPerHour(totalCoinsPerHour);
    } else {
      setCoinsPerHour(0);
    }
  }, [purchasedAutoClickerLevels, purchasedUpgrades]);

  // Сохранение уровня автокликера
  useEffect(() => {
    localStorage.setItem(AUTOCLICKER_LEVEL_KEY, autoClickerLevel.toString());
  }, [autoClickerLevel]);

  // Расчет офлайн заработка при запуске
  useEffect(() => {
    const calculateOfflineEarnings = () => {
      const lastOnline = localStorage.getItem(LAST_ONLINE_KEY);
      
      if (lastOnline && purchasedAutoClickerLevels.size > 0 && coinsPerHour > 0) {
        const lastOnlineTime = parseInt(lastOnline, 10);
        const now = Date.now();
        let offlineTime = now - lastOnlineTime;
        
        // Ограничиваем максимум 5 часами
        offlineTime = Math.min(offlineTime, MAX_OFFLINE_MS);
        
        const offlineHours = offlineTime / (1000 * 60 * 60);
        const earned = Math.floor(coinsPerHour * offlineHours);
        
        if (earned > 0) {
          setOfflineEarnings(earned);
        }
      }
    };

    calculateOfflineEarnings();
  }, [purchasedAutoClickerLevels, coinsPerHour]);

  // Обновление времени последнего онлайна
  useEffect(() => {
    const updateLastOnline = () => {
      localStorage.setItem(LAST_ONLINE_KEY, Date.now().toString());
    };

    updateLastOnline();
    const interval = setInterval(updateLastOnline, 60000);

    window.addEventListener('beforeunload', updateLastOnline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        updateLastOnline();
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', updateLastOnline);
    };
  }, []);

  // Отслеживание максимального количества монет
  useEffect(() => {
    if (coins > maxCoinsReached) {
      setMaxCoinsReached(coins);
    }
  }, [coins, maxCoinsReached]);

  // Пассивный доход от автокликера (каждую секунду)
  useEffect(() => {
    if (coinsPerHour <= 0) return;

    const interval = setInterval(() => {
      setCoins(prev => prev + coinsPerHour / 3600);
    }, 1000);
    return () => clearInterval(interval);
  }, [coinsPerHour]);

  // Восстановление энергии (каждую секунду на coinsPerClick, но максимум 5)
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(prev => {
        if (prev < maxEnergy) {
          const regeneration = Math.min(coinsPerClick, 5);
          return Math.min(prev + regeneration, maxEnergy);
        }
        return prev;
      });
    }, 1000); // Каждую секунду
    return () => clearInterval(interval);
  }, [maxEnergy, coinsPerClick]);

  // Обновление визуальных элементов
  const updateVisuals = (currentLevel) => {
    let toothLevel = 1;
    if (unlockedTeeth.has(3)) toothLevel = 3;
    else if (unlockedTeeth.has(2)) toothLevel = 2;
    
    let bgLevel = 1;
    if (unlockedBackgrounds.has(3)) bgLevel = 3;
    else if (unlockedBackgrounds.has(2) && unlockedTeeth.has(2)) bgLevel = 2;
    
    let charLevel = 1;
    if (unlockedCharacters.has(3)) charLevel = 3;
    else if (unlockedCharacters.has(2)) charLevel = 2;
    
    setToothImage(toothLevel === 1 ? Tooth1 : toothLevel === 2 ? Tooth2 : Tooth3);
    setBackground(bgLevel === 1 ? Background1 : bgLevel === 2 ? Background2 : Background3);
    setCharacter(charLevel === 1 ? Char1 : charLevel === 2 ? Char2 : Char3);
  };
  useEffect(() => {
    updateVisuals(level);
  }, [level, unlockedTeeth, unlockedBackgrounds, unlockedCharacters]);

  // Повышение уровня
  const upgradeLevel = (overflowExp = 0) => {
    const newLevel = level + 1;
    // Вычисляем требуемый опыт для следующего уровня
    const newExpRequired = calculateExpRequired(newLevel);
    
    setLevel(newLevel);
    setExpRequired(newExpRequired);
    updateVisuals(newLevel);
    
    if (overflowExp >= newExpRequired) {
      setExpCurrent(0);
      upgradeLevel(overflowExp - newExpRequired);
    } else {
      setExpCurrent(overflowExp);
    }
  };

  // Обработка клика
  const handleClick = () => {
    // Проверяем, хватает ли энергии для клика
    if (energy >= coinsPerClick) {
      // Сразу локально обновляем UI для отзывчивости
      setCoins(prev => prev + coinsPerClick);
      setEnergy(prev => prev - coinsPerClick);
      setTotalTaps(prev => prev + 1);
      
      // Добавляем опыт локально
      let newExp = expCurrent + coinsPerClick;
      
      // Если опыт превышает требуемый, отнимаем требуемый для каждого левелапа
      // (может быть несколько левелапов за раз)
      while (newExp >= expRequired) {
        newExp = newExp - expRequired;
        // Локально не повышаем уровень, это сделает сервер
      }
      
      setExpCurrent(newExp);
      
      // Добавляем клик в батч для отправки на сервер
      clickBatchRef.current.clicks += 1;
      clickBatchRef.current.timestamps.push(Date.now());
      
      // Если уже есть таймаут, очищаем его
      if (clickBatchTimeoutRef.current) {
        clearTimeout(clickBatchTimeoutRef.current);
      }
      
      // Устанавливаем таймаут на отправку батча через 150ms
      clickBatchTimeoutRef.current = setTimeout(() => {
        if (clickBatchRef.current.clicks > 0) {
          const batchSize = clickBatchRef.current.clicks;
          console.log(`[GameContext] Sending batch of ${batchSize} clicks`);
          
          // Отправляем батч кликов
          API.sendWebSocketMessage('game:click', {
            clicks: clickBatchRef.current.clicks,
            timestamps: clickBatchRef.current.timestamps
          });
          
          // Очищаем батч
          clickBatchRef.current = { clicks: 0, timestamps: [] };
          
          // Сервер сам отправит обновление состояния через WebSocket
          // (не запрашиваем явно, это экономит запросы к БД)
        }
      }, 150); // Отправляем каждые 150ms максимум
    }
  };

  const addCoins = (amount) => {
    setCoins(prev => prev + amount);
  };

  // Забрать офлайн заработок
  const claimOfflineEarnings = () => {
    if (offlineEarnings > 0) {
      setCoins(prev => prev + offlineEarnings);
      setOfflineEarnings(0);
      return true;
    }
    return false;
  };

  // Проверка, можно ли купить апгрейд (последовательная покупка)
  const canPurchaseUpgrade = (upgradeId) => {
    if (purchasedUpgrades.has(upgradeId)) {
      return false;
    }
    if (upgradeId === 7) {
      return purchasedAutoClickerLevels.has(5);
    }
    if (upgradeId === 5) {
      return purchasedUpgrades.has(4) && unlockedCharacters.has(2);
    }
    if (upgradeId === 1) {
      return true;
    }
    return purchasedUpgrades.has(upgradeId - 1);
  };

  // Проверка, можно ли купить автокликер (последовательная покупка)
  const canPurchaseAutoClicker = (level) => {
    if (level === 4) {
      return !purchasedAutoClickerLevels.has(level) && purchasedAutoClickerLevels.has(3) && unlockedCharacters.has(3);
    }
    if (level === 1) {
      return !purchasedAutoClickerLevels.has(level);
    }
    return !purchasedAutoClickerLevels.has(level) && purchasedAutoClickerLevels.has(level - 1);
  };

  // Покупка апгрейда кликера (только один раз, последовательно)
  const purchaseUpgrade = (upgradeId, cost, clickIncrease = 0, hourIncrease = 0) => {
    if (coins >= cost && canPurchaseUpgrade(upgradeId)) {
      setCoins(prev => prev - cost);
      if (clickIncrease > 0) {
        setBaseCoinsPerClick(prev => prev + clickIncrease);
      }
      if (hourIncrease > 0) {
        setCoinsPerHour(prev => prev + hourIncrease);
      }
      setPurchasedUpgrades(prev => new Set([...prev, upgradeId]));
      setUpgradesPurchased(prev => prev + 1);
      if (upgradeId === 2 && !unlockedTeeth.has(2)) {
        setUnlockedTeeth(prev => new Set([...prev, 2]));
      }
      if (upgradeId === 5 && !unlockedTeeth.has(3)) {
        setUnlockedTeeth(prev => new Set([...prev, 3]));
}
      return true;
    }
    return false;
  };

  // Покупка/апгрейд автокликера (только один раз каждого уровня, последовательно)
  const purchaseAutoClicker = (level, cost) => {
    if (coins >= cost && canPurchaseAutoClicker(level)) {
      setCoins(prev => prev - cost);
      setAutoClickerLevel(level);
      setPurchasedAutoClickerLevels(prev => new Set([...prev, level]));
      setUpgradesPurchased(prev => prev + 1);
      return true;
    }
    return false;
  };
  const purchaseCharacter3 = (cost) => {
    if (coins >= cost && unlockedCharacters.has(2) && !purchasedCharacter3) {
      setCoins(prev => prev - cost);
      setUnlockedCharacters(prev => new Set([...prev, 3]));
      setPurchasedCharacter3(true);
      return true;
    }
    return false;
  };

  const getUpgradeLockReason = (upgradeId) => {
    if (upgradeId === 7 && !purchasedAutoClickerLevels.has(5)) {
      return "Купите автокликер уровень 5";
    }
    if (upgradeId === 5 && !unlockedCharacters.has(2)) {
      return "Разблокируйте персонажа 2";
    }
    if (!canPurchaseUpgrade(upgradeId) && !purchasedUpgrades.has(upgradeId)) {
      return "Купите пред. апгрейд";
    }
    return null;
  };

  const getAutoClickerLockReason = (level) => {
    if (level === 4 && !unlockedCharacters.has(3)) {
      return "Разблокируйте персонажа 3";
    }
    if (!canPurchaseAutoClicker(level) && !purchasedAutoClickerLevels.has(level)) {
      return "Купите пред. уровень";
    }
    return null;
  };

    // ========== ПРОВЕРКИ ДЛЯ УВЕДОМЛЕНИЙ В ФУТЕРЕ ==========
  
  // Проверка наличия доступных наград в заданиях
  const hasAvailableTasks = () => {
    // Проверяем ежедневные задания
    const hasCompletedDaily = dailyTasks.some(task => task.completed && !task.claimed);
    
    // Проверяем еженедельные задания
    const hasCompletedWeekly = weeklyTasks.some(task => task.completed && !task.claimed);
    
    // Проверяем награды за вход
    const hasLoginReward = loginRewards.some(reward => 
      reward.day === currentStreak && !reward.claimed
    );

    return hasCompletedDaily || hasCompletedWeekly || hasLoginReward;
  };

  // Проверка наличия доступных апгрейдов
  const hasAvailableUpgrades = () => {
    // Список всех апгрейдов кликера
    const upgrades = [
      { id: 1, cost: 72000 },
      { id: 2, cost: 144000 },
      { id: 3, cost: 288000 },
      { id: 4, cost: 432000 },
      { id: 5, cost: 864000 },
      { id: 6, cost: 1568000 },
      { id: 7, cost: 2216000 }, // Специальный апгрейд (Ассистент)
    ];

    // Проверяем, есть ли доступные для покупки апгрейды кликера
    const hasAffordableUpgrade = upgrades.some(upgrade => 
      coins >= upgrade.cost && canPurchaseUpgrade(upgrade.id)
    );

    // Проверяем, есть ли доступные для покупки автокликеры
    const hasAffordableAutoClicker = autoClickerConfig.some(config =>
      coins >= config.cost && canPurchaseAutoClicker(config.level)
    );

    return hasAffordableUpgrade || hasAffordableAutoClicker;
  };

  // Вычисление требуемого опыта для уровня
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

  // Проверка наличия доступных услуг
  const hasAvailableServices = () => {
    // Проверяем, достаточно ли монет для покупки любой услуги
    // Дефолтная минимальная стоимость услуги 50000
    return coins >= 50000;
  };

  // Загрузка состояния игры с сервера
  const loadGameState = (serverData) => {
    console.log('[GameContext] loadGameState called with:', serverData);
    
    if (serverData.user) {
      // Структура ответа с сервера может быть { user: {...}, upgrades: {...}, ... }
      const user = serverData.user;
      if (user.coins !== undefined) setCoins(user.coins);
      if (user.energy !== undefined) setEnergy(user.energy);
      if (user.max_energy !== undefined) setMaxEnergy(user.max_energy);
      if (user.level !== undefined) {
        setLevel(user.level);
        // Вычисляем требуемый опыт для этого уровня
        setExpRequired(calculateExpRequired(user.level));
      }
      // Вычисляем опыт для текущего уровня
      if (user.experience !== undefined && user.level !== undefined) {
        const expForCurrentLevel = calculateExpForCurrentLevel(user.experience, user.level);
        console.log(`[GameContext] Experience: total=${user.experience}, level=${user.level}, forCurrentLevel=${expForCurrentLevel}`);
        setExpCurrent(Math.max(0, expForCurrentLevel)); // Не меньше 0
      }
      if (user.coins_per_click !== undefined) setCoinsPerClick(user.coins_per_click);
      if (user.base_coins_per_click !== undefined) setBaseCoinsPerClick(user.base_coins_per_click);
    } else {
      // Структура может быть плоская
      if (serverData.coins !== undefined) setCoins(serverData.coins);
      if (serverData.energy !== undefined) setEnergy(serverData.energy);
      if (serverData.max_energy !== undefined) setMaxEnergy(serverData.max_energy);
      if (serverData.level !== undefined) {
        setLevel(serverData.level);
        // Вычисляем требуемый опыт для этого уровня
        setExpRequired(calculateExpRequired(serverData.level));
      }
      // Вычисляем опыт для текущего уровня
      if (serverData.experience !== undefined && serverData.level !== undefined) {
        const expForCurrentLevel = calculateExpForCurrentLevel(serverData.experience, serverData.level);
        console.log(`[GameContext] Experience: total=${serverData.experience}, level=${serverData.level}, forCurrentLevel=${expForCurrentLevel}`);
        setExpCurrent(Math.max(0, expForCurrentLevel)); // Не меньше 0
      }
      if (serverData.coins_per_click !== undefined) setCoinsPerClick(serverData.coins_per_click);
      if (serverData.base_coins_per_click !== undefined) setBaseCoinsPerClick(serverData.base_coins_per_click);
    }
    
    if (serverData.activeBoosts) setActiveBonus(serverData.activeBoosts[0] || null);
  };

  // Инициализация WebSocket соединения
  useEffect(() => {
    const initSocket = async () => {
      // Небольшая задержка чтобы убедиться что токен загружен
      setTimeout(() => {
        console.log('[GameContext] Initializing WebSocket connection...');
        
        API.initializeWebSocket(
          (message) => {
            console.log('[GameContext] Received WebSocket message:', message);
            
            // Обрабатываем разные типы сообщений от сервера
            if (message.type === 'game:state') {
              console.log('[GameContext] Loading game state from server (game:state event)');
              // Сервер отправляет полное состояние игры
              loadGameState(message.data);
            } else if (message.type === 'energy:update') {
              // Обновляем только энергию
              console.log('[GameContext] Updating energy:', message.data);
              if (message.data.energy !== undefined) {
                setEnergy(message.data.energy);
              }
            } else if (message.type === 'game:click:result') {
              // Результат клика - можно игнорировать, состояние придёт в game:state
              console.log('[GameContext] Click result received');
            }
          },
          (error) => {
            console.error('[GameContext] WebSocket error:', error);
          }
        );
      }, 1000);
    };

    initSocket();

    // Cleanup при размонтировании
    return () => {
      // Отправляем оставшиеся клики перед отключением
      if (clickBatchRef.current.clicks > 0) {
        console.log(`[GameContext] Sending final batch of ${clickBatchRef.current.clicks} clicks on unmount`);
        API.sendWebSocketMessage('game:click', {
          clicks: clickBatchRef.current.clicks,
          timestamps: clickBatchRef.current.timestamps
        });
      }
      
      // Очищаем таймаут
      if (clickBatchTimeoutRef.current) {
        clearTimeout(clickBatchTimeoutRef.current);
      }
      
      API.closeWebSocket();
    };
  }, []);

  const value = {
    coins,
    level,
    energy,
    maxEnergy,
    coinsPerClick,
    baseCoinsPerClick,
    coinsPerHour,
    expCurrent,
    expRequired,
    userProfile,
    totalTaps,
    maxCoinsReached,
    upgradesPurchased,
    toothImage,
    background,
    character,
    autoClickerLevel,
    autoClickerConfig,
    offlineEarnings,
    purchasedUpgrades,
    purchasedAutoClickerLevels,
    canPurchaseUpgrade,
    canPurchaseAutoClicker,
    handleClick,
    addCoins,
    purchaseUpgrade,
    purchaseAutoClicker,
    claimOfflineEarnings,
    upgradeLevel,
    setUserProfile,
    dailyTasks,
    weeklyTasks,
    loginRewards,
    currentStreak,
    handleClaimTaskReward,
    handleClaimLoginReward,
    activeBonus,
    activateTapBonus,
    hasAvailableTasks,
    hasAvailableUpgrades,
    hasAvailableServices,
    invitedFriendsCount,
    unlockedBackgrounds,
    unlockedTeeth,
    unlockedCharacters,
    purchasedCharacter3,
    inviteFriend,
    purchaseCharacter3,
    getUpgradeLockReason,
    getAutoClickerLockReason,
    loadGameState,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};