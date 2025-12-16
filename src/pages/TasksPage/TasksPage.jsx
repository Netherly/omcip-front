import React, { useState, useEffect } from "react";
import "./TasksPage.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import TaskCard from "./components/TaskCard";
import LoginRewardCard from "./components/LoginRewardCard";
import { useGame } from "../../context/GameContext";
import * as API from "../../utils/api";

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [lastDailyClaimDate, setLastDailyClaimDate] = useState(null); // Дата последнего клайма
  const [showTaskSkipModal, setShowTaskSkipModal] = useState(false); // Показать модал выбора задания
  const [selectedRewardForSkip, setSelectedRewardForSkip] = useState(null); // Выбранная TASK_SKIP награда
  const [claimingReward, setClaimingReward] = useState(null); // ID награды/задачи в процессе клейма (защита от двойных кликов)
  
  const { 
    background,
    dailyTasks,
    weeklyTasks,
    loginRewards,
    currentLoginStreak,
    loadingTasks,
    addCoins,
    loadDailyTasks,
    loadWeeklyTasks,
    loadLoginRewards,
    loadGameState,
    activateTapBonus,
    upgrades,
    loadingUpgrades,
  } = useGame();

  // Загружаем задачи с сервера при открытии страницы
  useEffect(() => {
    // Данные уже загружаются в GameContext при инициализации
  }, []);

  // Загрузка данных происходит в GameContext

  // Адаптируем данные задач из API к формату компонента
  const adaptTaskData = (task) => {
    // Определяем награду - может быть moneta (reward_coins) или буст (reward_boost_multiplier)
    let reward = 0;
    if (task.reward_coins > 0) {
      reward = task.reward_coins;
    } else if (task.reward_boost_multiplier > 0) {
      reward = 0; // Для бустов будем показывать отдельно
    } else {
      reward = task.reward || 0;
    }

    return {
      id: task.id,
      title: task.title || task.name || 'Unknown',
      reward: reward,
      rewardBoostMultiplier: task.reward_boost_multiplier || 0,
      rewardBoostDuration: task.reward_boost_duration || 0,
      type: task.type || task.period || 'daily',
      completed: task.completed || false,
      claimed: task.claimed || false,
      progress: parseInt(task.progress) || 0,
      maxProgress: parseInt(task.maxProgress) || parseInt(task.requirement_value) || 100,
      description: task.description || '',
      ...task // Сохраняем все остальные свойства на случай если они нужны
    };
  };

  // Адаптируем список задач
  const adaptedDailyTasks = dailyTasks.map(adaptTaskData);
  const adaptedWeeklyTasks = weeklyTasks.map(adaptTaskData);

  // Адаптируем награды за вход
  const adaptLoginRewardData = (reward) => {
    return {
      ...reward,
      day: reward.day || reward.id || 1,
      title: reward.title || `День ${reward.day || reward.id}`,
      description: reward.description || '',
      amount: reward.amount || reward.reward || 0,
      // Используем claimed от сервера! Он уже правильно вычислен
    };
  };

  // Определяем, можно ли получить награду за день
  // День можно получить только если:
  // 1. Это текущий день в стрике (reward.day === currentLoginStreak)
  // 2. Еще не было клайма сегодня (claimed_today === false)
  const isClaimedToday = (reward) => {
    // Сервер отправляет claimed_today в каждую награду
    return reward.claimed_today === true;
  };

  const adaptedLoginRewards = loginRewards.map(adaptLoginRewardData);



  const currentTasks = activeTab === "daily" 
    ? adaptedDailyTasks
    : activeTab === "weekly" 
      ? adaptedWeeklyTasks
      : adaptedLoginRewards;

  const handleTaskClaim = async (task) => {
    // Защита от множественных кликов
    if (claimingReward === task.id) {
      return;
    }

    setClaimingReward(task.id);
    try {
      const response = await API.claimTaskReward(task.id);
      
      if (response.success || response.data) {
        let message = '';
        const data = response.data || response;
        let coinsAwarded = 0;
        
        // ВАЖНО: Сначала обновляем игровое состояние со сервера 
        // чтобы получить актуальные коины ПОСЛЕ клейма
        try {
          const gameStateResponse = await API.getGameState();
          if (gameStateResponse && gameStateResponse.data) {
            loadGameState(gameStateResponse.data);
          }
        } catch (err) {
          console.error("Failed to reload game state:", err);
        }
        
        // Обработка в зависимости от типа награды
        if (data.reward_boost_multiplier && Number(data.reward_boost_multiplier) > 0) {
          // Это бост-награда
          const multiplier = Number(data.reward_boost_multiplier) || 2;
          const duration = Number(data.reward_boost_duration) || 60;
          activateTapBonus(multiplier, duration);
          message = `🚀 Активирован бонус ×${multiplier} на ${duration} мин!`;
        } else if (data.reward_coins && Number(data.reward_coins) > 0) {
          // Это монеты - уже добавлены с серверной стороны при загрузке gameState
          coinsAwarded = Number(data.reward_coins) || 0;
          message = `Получено ${coinsAwarded} монет!`;
        } else {
          message = 'Награда получена!';
        }
        
        setNotification(message);
        setTimeout(() => setNotification(null), 5000);
        
        // Перезагружаем задачи чтобы обновить состояние "Получено"
        if (activeTab === "daily") {
          await loadDailyTasks();
        } else if (activeTab === "weekly") {
          await loadWeeklyTasks();
        }
      }
    } catch (err) {
      console.error("Failed to claim task reward:", err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setClaimingReward(null);
    }
  };

  const handleLoginRewardClaim = async (reward) => {
    // Защита от множественных кликов
    if (claimingReward === `login_${reward.day}`) {
      return;
    }

    setClaimingReward(`login_${reward.day}`);
    try {
      // Получаем награду за конкретный день (эндпоинт /login-rewards/:day/claim)
      const result = await API.claimLoginReward(reward.day);
      if (result && result.data) {
        const data = result.data;
        
        // Если это TASK_SKIP награда - показываем модал для выбора задания
        if (data.reward_type === 'task_skip') {
          // Issue 4.4 - Проверяем что есть доступные задания
          const availableTasks = dailyTasks.filter(t => !t.completed);
          
          if (availableTasks.length === 0) {
            setNotification('⚠️ Все ежедневные задания выполнены. Task Skip сохранен.');
            setTimeout(() => setNotification(null), 5000);
            await loadLoginRewards();
            return;
          }
          
          setSelectedRewardForSkip(reward);
          setShowTaskSkipModal(true);
          setNotification(`✓ День ${reward.day}! Выберите задание для выполнения`);
          setTimeout(() => setNotification(null), 5000);
          
          // Issue 3.1 - Перезагружаем ВСЕ задачи только для Task Skip
          await loadDailyTasks();
          await loadWeeklyTasks();
          await loadLoginRewards();
          return;
        }
        
        let rewardMessage = '';
        
        // Формируем сообщение о награде в зависимости от типа
        if (data.weekly_task_skip) {
          rewardMessage = `✨ Задача "${data.weekly_task_skip.task_name}" выполнена!`;
        } else if (data.reward_coins && data.reward_coins > 0) {
          rewardMessage = `🪙 ${data.reward_coins} монет`;
        } else if (data.boost_multiplier && data.boost_duration) {
          rewardMessage = `🚀 ×${data.boost_multiplier} на ${data.boost_duration} мин`;
        } else if (data.chest_boost) {
          rewardMessage = `🚀 ×${data.chest_boost.multiplier} на ${data.chest_boost.duration} мин`;
        } else if (data.reward_type === 'boost') {
          rewardMessage = `🚀 Активирован бонус`;
        } else {
          rewardMessage = 'Награда получена';
        }
        
        const message = `✓ День ${reward.day} ${rewardMessage}!`;
        setNotification(message);
        setTimeout(() => setNotification(null), 4000);
        
        // Issue 3.2 - Если получили буст - активируем его с обработкой ошибок
        try {
          if (data.reward_type === 'boost' && data.boost_multiplier && data.boost_duration) {
            activateTapBonus(data.boost_multiplier, data.boost_duration);
          } else if (data.chest_boost) {
            // Для сундука с бустом
            activateTapBonus(data.chest_boost.multiplier, data.chest_boost.duration);
          }
        } catch (boostError) {
          console.error('[TasksPage] Failed to activate boost:', boostError);
          setError('Буст получен, но не активирован. Обновите страницу.');
          setTimeout(() => setError(null), 5000);
        }
        
        // Обновляем баланс коинов из ответа API если он вернул текущий баланс
        if (data.current_balance !== undefined) {
          // Вычисляем сколько коинов получили
          const coinsReceived = data.reward_coins ? parseInt(data.reward_coins) : 0;
          if (coinsReceived > 0) {
            addCoins(coinsReceived);
          }
        } else if (data.reward_coins > 0 || (data.chest_boost && !data.chest_boost)) {
          // Иначе загружаем состояние со сервера
          try {
            const gameStateResponse = await API.getGameState();
            if (gameStateResponse && gameStateResponse.data) {
              loadGameState(gameStateResponse.data);
            }
          } catch (err) {
            console.error("Failed to reload game state:", err);
          }
        }
        
        // Issue 3.1 - Перезагружаем только login rewards (daily/weekly не изменяются)
        await loadLoginRewards();
      }
    } catch (err) {
      console.error("Failed to claim login reward:", err);
      setError(err.message || "Не удалось получить награду за день");
      setTimeout(() => setError(null), 5000);
    } finally {
      setClaimingReward(null);
    }
  };

  const handleSkipTask = async (task) => {
    try {
      const result = await API.skipDailyTask(task.id);
      
      if (result && result.data) {
        const taskName = task.title || task.name || 'Задание';
        setNotification(`✓ Задание "${taskName}" выполнено!`);
        setTimeout(() => setNotification(null), 4000);
        
        // Закрываем модал
        setShowTaskSkipModal(false);
        setSelectedRewardForSkip(null);
        
        // Перезагружаем задачи чтобы обновить статус
        await loadDailyTasks();
        await loadWeeklyTasks();
        await loadLoginRewards();
      }
    } catch (err) {
      console.error("Failed to skip daily task:", err);
      setError(err.message || "Не удалось выполнить задание");
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div 
      className="tasks-page"
      style={{ backgroundImage: `url(${background})` }}
    >
      <Header />
      
      {notification && (
        <div className="tasks-page__notification">
          {notification}
        </div>
      )}
      
      <main className="tasks-page__content">
        <div className="tasks-page__tabs">
          <button
            className={`tasks-page__tab ${activeTab === "daily" ? "tasks-page__tab--active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            Ежедневные
          </button>
          <button
            className={`tasks-page__tab ${activeTab === "weekly" ? "tasks-page__tab--active" : ""}`}
            onClick={() => setActiveTab("weekly")}
          >
            Еженедельные
          </button>
          <button
            className={`tasks-page__tab ${activeTab === "login" ? "tasks-page__tab--active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Вход
          </button>
        </div>

        <div className="tasks-page__list">
          {activeTab === "login" ? (
            adaptedLoginRewards && adaptedLoginRewards.length > 0 ? (
              adaptedLoginRewards.map((reward) => (
                <LoginRewardCard
                  key={reward.day}
                  reward={reward}
                  canClaim={reward.day === currentLoginStreak && !isClaimedToday(reward)}
                  isClaimed={reward.claimed === true}
                  isLoading={claimingReward === `login_${reward.day}`}
                  onClaim={() => handleLoginRewardClaim(reward)}
                />
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center' }}>Нет доступных наград</div>
            )
          ) : currentTasks && currentTasks.length > 0 ? (
            currentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isLoading={claimingReward === task.id}
                onClaim={() => handleTaskClaim(task)}
              />
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center' }}>Нет доступных задач</div>
          )}
        </div>
      </main>

      {/* Modal for TASK_SKIP reward - choose which task to skip */}
      {showTaskSkipModal && (
        <div className="tasks-page__modal-overlay" onClick={() => setShowTaskSkipModal(false)}>
          <div className="tasks-page__modal" onClick={(e) => e.stopPropagation()}>
            <h2>Выберите задание для выполнения</h2>
            <div className="tasks-page__modal-tasks">
              {dailyTasks && dailyTasks.length > 0 ? (
                // Показываем только незаполненные задания (не completed или не claimed)
                dailyTasks
                  .filter(task => !task.completed || !task.claimed)
                  .map((task) => (
                    <div key={task.id} className="tasks-page__modal-task">
                      <div className="tasks-page__modal-task-info">
                        <span className="tasks-page__modal-task-title">{task.title || task.name}</span>
                        <span className="tasks-page__modal-task-desc">{task.description}</span>
                      </div>
                      <button
                        className="tasks-page__modal-task-button"
                        onClick={() => handleSkipTask(task)}
                      >
                        Выполнить
                      </button>
                    </div>
                  ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>Нет доступных задач</div>
              )}
            </div>
            <button
              className="tasks-page__modal-close"
              onClick={() => setShowTaskSkipModal(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TasksPage;