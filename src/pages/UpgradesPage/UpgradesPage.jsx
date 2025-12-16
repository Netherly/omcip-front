import React, { useState, useEffect } from "react";
import "./UpgradesPage.css";
import Footer from "../../components/Footer/Footer";
import UpgradeCard from "./components/UpgradeCard";
import AutoClickerCard from "./components/AutoClickerCard";
import { useGame } from "../../context/GameContext";
import * as API from "../../utils/api";
import { formatNumber } from "../../utils/formatters";
import zondImg from "../../assets/images/upgrades/zond.png";
import mirrorImg from "../../assets/images/upgrades/mirror.png";
import gladilkaImg from "../../assets/images/upgrades/gladilka.png";
import shpricImg from "../../assets/images/upgrades/shpric.png";
import naborImg from "../../assets/images/upgrades/nabor.png";
import lotokImg from "../../assets/images/upgrades/lotok.png";
import assistantImg from "../../assets/images/upgrades/assistant.png";
import checkImg from "../../assets/images/upgrades/check.png";
import Char3 from "../../assets/images/char3.svg";

/**
 * Маппинг названий иконок от сервера к импортированным SVG
 * Стандартные названия совпадают с icon полем в базе данных (upgrades.seed.ts)
 */
const upgradeImageMap = {
  'probe': zondImg,
  'mirror': mirrorImg,
  'smoother': gladilkaImg,
  'syringe': shpricImg,
  'kit': naborImg,
  'tray': lotokImg,
  'assistant': assistantImg,
  'check': checkImg,
};

const UpgradesPage = () => {
  const [activeTab, setActiveTab] = useState("clicker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    coins, 
    purchaseUpgrade, 
    purchaseAutoClicker,
    purchaseAutoClickerLevel,
    autoClickerStatus,
    autoClickerConfig,
    purchasedUpgrades,
    purchasedAutoClickerLevels,
    canPurchaseUpgrade,
    canPurchaseAutoClicker,
    background,
    getUpgradeLockReason,
    getAutoClickerLockReason,
    purchaseCharacter3,
    unlockedCharacters,
    purchasedCharacter3,
    // Новые свойства из GameContext
    upgrades,
    userUpgrades,
    loadingUpgrades,
    checkUnlockConditions,
  } = useGame();

  // Загружаем апгрейды с сервера при открытии страницы
  useEffect(() => {
    // Данные уже загружаются в GameContext при инициализации
    // Здесь ничего дополнительного не нужно
  }, []);

  // Загружаем статус автокликера при переходе на вкладку автокликера
  useEffect(() => {
    if (activeTab === "autoclicker" && autoClickerStatus?.level === undefined) {
      // Если статус не загружен, загружаем его
      const loadAutoClickerStatus = async () => {
        try {
          const status = await API.getAutoClickerStatus();
        } catch (err) {
          console.error("[UpgradesPage] Failed to load auto-clicker status:", err);
        }
      };
      loadAutoClickerStatus();
    }
  }, [activeTab]);

  // Загрузка данных происходит в GameContext, здесь используем только то что там загружено

  // Заглушка для апгрейдов если они не приходят с сервера
  const defaultUpgrades = [
    {
      id: 1,
      name: "Зонд",
      title: "Зонд",
      image: zondImg,
      perTap: 2,
      cost: 72000,
      base_cost: 72000,
      base_value: 2,
      clickIncrease: 2,
    },
    {
      id: 2,
      name: "Зеркало",
      title: "Зеркало",
      image: mirrorImg,
      perTap: 3,
      cost: 144000,
      base_cost: 144000,
      base_value: 3,
      clickIncrease: 3,
    },
    {
      id: 3,
      name: "Гладилка",
      title: "Гладилка",
      image: gladilkaImg,
      perTap: 4,
      cost: 288000,
      base_cost: 288000,
      base_value: 4,
      clickIncrease: 4,
    },
    {
      id: 4,
      name: "Шприц",
      title: "Шприц",
      image: shpricImg,
      perTap: 5,
      cost: 432000,
      base_cost: 432000,
      base_value: 5,
      clickIncrease: 5,
    },
    {
      id: 5,
      name: "Набор",
      title: "Набор",
      image: naborImg,
      perTap: 10,
      cost: 864000,
      base_cost: 864000,
      base_value: 10,
      clickIncrease: 10,
    },
    {
      id: 6,
      name: "Лоток",
      title: "Лоток",
      image: lotokImg,
      perTap: 20,
      cost: 1568000,
      base_cost: 1568000,
      base_value: 20,
      clickIncrease: 20,
    },
    {
      id: 7,
      name: "Ассистент",
      title: "Ассистент",
      image: assistantImg,
      perTap: 25,
      cost: 2216000,
      base_cost: 2216000,
      base_value: 25,
      clickIncrease: 25,
      bonus: "Увеличивает автокликер в 1,5 раза",
      bonusIcon: checkImg,
    },
  ];

  const handlePurchase = async (upgrade) => {
    try {
      // Подтверждение для дорогих покупок (>500,000 монет)
      if (upgrade.cost > 500000) {
        const confirmed = window.confirm(
          `Вы уверены, что хотите купить "${upgrade.name}" за ${formatNumber(upgrade.cost)} монет?`
        );
        if (!confirmed) return;
      }
      await purchaseUpgrade(upgrade.id);
    } catch (err) {
      console.error("Failed to purchase upgrade:", err);
      setError(err.message);
    }
  };

  const handleAutoClickerPurchase = async (config) => {
    try {
      setLoading(true);
      const success = await purchaseAutoClickerLevel();
      if (!success) {
        setError("Не удалось купить уровень автокликера");
      }
    } catch (err) {
      console.error("Failed to purchase auto-clicker:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regularAutoClickers = autoClickerConfig.slice(0, 4);
  const specialAutoClicker = autoClickerConfig[4];
  
  // Конфиг для персонажа 3
  const character3Config = {
    id: 'character3',
    name: 'Персонаж 3',
    image: Char3,
    cost: 1000000,
  };
  
  const handleCharacter3Purchase = () => {
    purchaseCharacter3(1000000);
  };

  // Адаптируем данные апгрейдов из API к формату компонента
  const adaptUpgradeData = (upgrade) => {
    // Получаем количество раз, которое это улучшение уже куплено (0 или 1)
    const purchaseCount = Array.isArray(userUpgrades) 
      ? userUpgrades.filter(u => u.upgrade_id === upgrade.id).length 
      : 0;
    
    // Вычисляем текущую цену: base_cost * (cost_multiplier ^ purchaseCount)
    // Если уже куплено, цена для следующей покупки (но это не допускается)
    const baseCost = parseFloat(upgrade.base_cost) || 0;
    const costMultiplier = parseFloat(upgrade.cost_multiplier) || 1;
    const currentCost = Math.floor(baseCost * Math.pow(costMultiplier, purchaseCount));
    
    // Обработка названия (переименования)
    let upgradeName = upgrade.name || upgrade.title || 'Unknown';
    if (upgradeName === 'Набор') {
      upgradeName = 'Набор инструментов';
    }
    
    // Обработка картинки через маппинг
    // Приоритет: icon (стандартное поле из БД) > image (legacy)
    const iconName = upgrade.icon || upgrade.image || '';
    const mappedImage = upgradeImageMap[iconName];
    
    // Проверка на отсутствие картинки - выводим ошибку для отладки
    if (iconName && !mappedImage) {
      console.error(
        `[UpgradesPage] Upgrade "${upgradeName}" (${upgrade.id}): ` +
        `icon "${iconName}" not found in upgradeImageMap.\n` +
        `Available icons: ${Object.keys(upgradeImageMap).join(', ')}`
      );
    }
    
    const adapted = {
      id: upgrade.id,
      name: upgradeName,
      image: mappedImage || checkImg, // Fallback на checkImg если картинка не найдена
      cost: currentCost,
      perTap: upgrade.base_value || upgrade.perTap || upgrade.coins_per_click || 0,
      bonus: upgrade.bonus || null,
      bonusIcon: upgrade.bonusIcon || null,
      ...upgrade // Сохраняем все остальные свойства на случай если они нужны
    };
    return adapted;
  };

  // Адаптируем список апгрейдов
  const listToUse = upgrades && upgrades.length > 0 ? upgrades : defaultUpgrades;
  const adaptedUpgrades = listToUse.map(adaptUpgradeData);
  const specialUpgrade = adaptedUpgrades.length > 0 ? adaptedUpgrades[adaptedUpgrades.length - 1] : null;
  const regularUpgrades = adaptedUpgrades.slice(0, -1);

  // Функция для проверки условий блокировки апгрейда
  const getUpgradeLockInfo = (upgrade) => {
    // Проверяем куплено ли это улучшение по upgrade_id
    const isPurchased = Array.isArray(userUpgrades) && userUpgrades.some(u => u.upgrade_id === upgrade.id);
    
    // Если уже куплено, не блокируем
    if (isPurchased) {
      return { isLocked: false, reason: null };
    }
    
    // Проверяем условия разблокировки с сервера
    const unlockCheck = checkUnlockConditions(upgrade);
    if (unlockCheck.isLocked) {
      return unlockCheck;
    }
    
    // Используем встроенную функцию для проверки возможности покупки
    const canPurchase = canPurchaseUpgrade(upgrade.id);
    
    if (!canPurchase) {
      const reason = getUpgradeLockReason(upgrade.id);
      return { isLocked: true, reason: reason || "Купите предыдущий апгрейд" };
    }
    
    return { isLocked: false, reason: null };
  };

  return (
    <div
      className="upgrades-page"
      style={{ backgroundImage: `url(${background})` }}
    >
      <main className="upgrades-page__content">
        <h1 className="upgrades-page__title">Апгрейды</h1>
        
        <div className="upgrades-page__tabs">
          <button
            className={`upgrades-page__tab ${activeTab === "clicker" ? "upgrades-page__tab--active" : ""}`}
            onClick={() => setActiveTab("clicker")}
          >
            Кликер
          </button>
          <button
            className={`upgrades-page__tab ${activeTab === "autoclicker" ? "upgrades-page__tab--active" : ""}`}
            onClick={() => setActiveTab("autoclicker")}
          >
            Автокликер
          </button>
          <button
            className={`upgrades-page__tab ${activeTab === "appearance" ? "upgrades-page__tab--active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            Вид
          </button>
        </div>

        {activeTab === "clicker" ? (
          <>
            <div className="upgrades-page__grid">
              {regularUpgrades.map((upgrade) => {
                const lockInfo = getUpgradeLockInfo(upgrade);
                const isPurchased = Array.isArray(userUpgrades) && userUpgrades.some(u => u.upgrade_id === upgrade.id);
                const canAfford = coins >= upgrade.cost;
                
                return (
                  <UpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    isPurchased={isPurchased}
                    canAfford={canAfford && !lockInfo.isLocked}
                    onPurchase={() => handlePurchase(upgrade)}
                    isLocked={lockInfo.isLocked}
                    lockReason={lockInfo.reason}
                  />
                );
              })}
            </div>

            <div className="upgrades-page__special">
              {(() => {
                if (!specialUpgrade) return null;
                // Проверяем куплено ли это улучшение по upgrade_id
                const isPurchased = Array.isArray(userUpgrades) && userUpgrades.some(u => u.upgrade_id === specialUpgrade.id);
                const lockInfo = getUpgradeLockInfo(specialUpgrade);
                const canAfford = coins >= specialUpgrade.cost;
                
                return (
                  <UpgradeCard
                    upgrade={specialUpgrade}
                    isPurchased={isPurchased}
                    canAfford={canAfford && !lockInfo.isLocked}
                    onPurchase={() => handlePurchase(specialUpgrade)}
                    isSpecial={true}
                    isLocked={lockInfo.isLocked}
                    lockReason={lockInfo.reason}
                  />
                );
              })()}
            </div>
          </>
        ) : activeTab === "autoclicker" ? (
          <>
            <div className="upgrades-page__grid">
              {regularAutoClickers.map((config) => {
                // Проверяем куплен ли этот уровень (если текущий уровень >= этому уровню)
                const currentLevel = autoClickerStatus?.level ?? 0;
                const isPurchased = currentLevel >= config.level;
                
                // Для уровня 1: доступен если текущий уровень 0
                // Для остальных: доступен если текущий уровень == этому уровню - 1
                let isNextLevel;
                if (config.level === 1) {
                  isNextLevel = currentLevel === 0;
                } else {
                  isNextLevel = currentLevel === config.level - 1;
                }
                
                const canAfford = coins >= config.cost;
                
                // Специальная проверка для уровня 4 - требует персонаж 3
                let lockReason = null;
                let isLocked = !isNextLevel && !isPurchased;
                
                if (config.level === 4 && !purchasedCharacter3) {
                  isLocked = true;
                  lockReason = "Требуется Персонаж 3";
                } else if (!isNextLevel && !isPurchased) {
                  lockReason = "Купите пред. уровень";
                }
                
                return (
                  <AutoClickerCard
                    key={config.level}
                    config={config}
                    isPurchased={isPurchased}
                    canAfford={canAfford && isNextLevel && !isLocked}
                    onPurchase={() => handleAutoClickerPurchase(config)}
                    isLocked={isLocked}
                    lockReason={lockReason}
                  />
                );
              })}
            </div>

            <div className="upgrades-page__special">
              {(() => {
                // Для special (5 уровня) - куплен если level >= 5
                const currentLevel = autoClickerStatus?.level ?? 0;
                const isPurchased = currentLevel >= specialAutoClicker.level;
                const isNextLevel = currentLevel === specialAutoClicker.level - 1;
                const canAfford = coins >= specialAutoClicker.cost;
                
                // Проверка для уровня 5 - НЕ требует персонаж 3, только требует уровень 4
                let lockReason = null;
                let isLocked = !isNextLevel && !isPurchased;
                
                if (!isNextLevel && !isPurchased) {
                  lockReason = "Купите пред. уровень";
                }
                
                return (
                  <AutoClickerCard
                    config={specialAutoClicker}
                    isPurchased={isPurchased}
                    canAfford={canAfford && isNextLevel && !isLocked}
                    onPurchase={() => handleAutoClickerPurchase(specialAutoClicker)}
                    isSpecial={true}
                    isLocked={isLocked}
                    lockReason={lockReason}
                  />
                );
              })()}
            </div>
          </>
        ) : (
          <div className="upgrades-page__special">
            <UpgradeCard
              upgrade={{
                id: character3Config.id,
                name: character3Config.name,
                image: character3Config.image,
                perTap: 0,
                cost: character3Config.cost,
              }}
              isPurchased={purchasedCharacter3}
              canAfford={coins >= character3Config.cost && unlockedCharacters.has(2) && !purchasedCharacter3}
              onPurchase={handleCharacter3Purchase}
              isSpecial={true}
              isLocked={!unlockedCharacters.has(2)}
              hidePerTap={true}
              lockReason={!unlockedCharacters.has(2) ? "Разблокируйте персонажа 2" : null}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UpgradesPage;