// Backgrounds
import Background1 from "../assets/images/background_lvl1.png";
import Background2 from "../assets/images/background_lvl2.png";
import Background3 from "../assets/images/background_lvl3.png";

// Teeth
import Tooth1 from "../assets/images/tooth1.svg";
import Tooth2 from "../assets/images/tooth2.svg";
import Tooth3 from "../assets/images/tooth3.svg";

// Characters - APNG для всех платформ (Android, iOS, PC)
import Char1 from "../assets/images/char1.apng";
import Char2 from "../assets/images/char2.apng";
import Char3 from "../assets/images/char3.apng";

// Game UI
import ToothCoin from "../assets/images/tooth_coin.svg";
import ProfilePlaceholder from "../assets/images/profile-placeholder.png";

// Footer icons
import serviceImg from "../assets/images/service.png";
import upgradeImg from "../assets/images/upgrade.png";
import mainImg from "../assets/images/main.svg";
import taskImg from "../assets/images/task.png";
import characterImg from "../assets/images/character.png";

// Services
import Discount10 from "../assets/images/services/discount-10.png";
import Discount20 from "../assets/images/services/discount-20.png";
import Discount30 from "../assets/images/services/discount-30.png";
import Cleaning from "../assets/images/services/cleaning.png";
import Consultation from "../assets/images/services/consultation.png";
import Implant from "../assets/images/services/implant.png";
import Crown from "../assets/images/services/crown.png";
import Scanner from "../assets/images/services/scanner.png";
import Tomography from "../assets/images/services/tomography.png";
import Certificate3000 from "../assets/images/services/certificate-3000.png";
import Certificate5000 from "../assets/images/services/certificate-5000.png";

// Upgrades
import zondImg from "../assets/images/upgrades/zond.png";
import mirrorImg from "../assets/images/upgrades/mirror.png";
import gladilkaImg from "../assets/images/upgrades/gladilka.png";
import shpricImg from "../assets/images/upgrades/shpric.png";
import naborImg from "../assets/images/upgrades/nabor.png";
import lotokImg from "../assets/images/upgrades/lotok.png";
import assistantImg from "../assets/images/upgrades/assistant.png";
import checkImg from "../assets/images/upgrades/check.png";

/**
 * Получение критичных изображений на основе разблокированных уровней
 * Эти изображения загружаются первыми для главного экрана
 */
export const getCriticalImages = (unlockedBackgrounds, unlockedTeeth, unlockedCharacters) => {
  const images = [
    ToothCoin,
    mainImg, // Главная иконка footer
  ];
  
  // Определяем текущий фон (наивысший разблокированный)
  if (unlockedBackgrounds?.has(3)) {
    images.push(Background3);
  } else if (unlockedBackgrounds?.has(2)) {
    images.push(Background2);
  } else {
    images.push(Background1);
  }
  
  // Определяем текущий зуб (наивысший разблокированный)
  if (unlockedTeeth?.has(3)) {
    images.push(Tooth3);
  } else if (unlockedTeeth?.has(2)) {
    images.push(Tooth2);
  } else {
    images.push(Tooth1);
  }
  
  // Определяем текущего персонажа (наивысший разблокированный)
  if (unlockedCharacters?.has(3)) {
    images.push(Char3);
  } else if (unlockedCharacters?.has(2)) {
    images.push(Char2);
  } else {
    images.push(Char1);
  }
  
  return images;
};

/**
 * Получение важных изображений (UI элементы + предыдущие уровни)
 * Загружаются во вторую очередь
 */
export const getImportantImages = (unlockedBackgrounds, unlockedTeeth, unlockedCharacters) => {
  const images = [
    ProfilePlaceholder,
    // Footer иконки
    serviceImg,
    upgradeImg,
    taskImg,
    characterImg,
  ];
  
  // Добавляем предыдущие уровни фонов (если текущий не 1)
  if (unlockedBackgrounds?.has(3)) {
    images.push(Background2, Background1);
  } else if (unlockedBackgrounds?.has(2)) {
    images.push(Background1);
  }
  
  // Добавляем предыдущие уровни зубов (если текущий не 1)
  if (unlockedTeeth?.has(3)) {
    images.push(Tooth2, Tooth1);
  } else if (unlockedTeeth?.has(2)) {
    images.push(Tooth1);
  }
  
  // Добавляем предыдущие уровни персонажей (если текущий не 1)
  if (unlockedCharacters?.has(3)) {
    images.push(Char2, Char1);
  } else if (unlockedCharacters?.has(2)) {
    images.push(Char1);
  }
  
  return images;
};

/**
 * ДОПОЛНИТЕЛЬНЫЕ изображения - загружаются в фоне (низкий приоритет)
 * Услуги и апгрейды загружаются когда пользователь открывает соответствующие страницы
 */
export const additionalImages = [
  // Services - загружаются когда открывается страница услуг
  Discount10,
  Discount20,
  Discount30,
  Cleaning,
  Consultation,
  Implant,
  Crown,
  Scanner,
  Tomography,
  Certificate3000,
  Certificate5000,
  
  // Upgrades - загружаются когда открывается страница апгрейдов
  zondImg,
  mirrorImg,
  gladilkaImg,
  shpricImg,
  naborImg,
  lotokImg,
  assistantImg,
  checkImg,
];

/**
 * Кэш загруженных изображений
 */
const imageCache = new Set();

/**
 * Загрузка одного изображения
 */
const loadImage = (src) => {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => {
      console.warn(`Failed to load: ${src}`);
      resolve();
    };
    img.src = src;
  });
};

/**
 * Загрузка массива изображений с прогрессом
 */
const loadImageBatch = (images, onProgress) => {
  return new Promise((resolve) => {
    if (images.length === 0) {
      resolve();
      return;
    }

    let loaded = 0;
    const promises = images.map((src) =>
      loadImage(src).then(() => {
        loaded++;
        if (onProgress) {
          onProgress(loaded / images.length);
        }
      })
    );

    Promise.all(promises).then(resolve);
  });
};

/**
 * Прелоад только критичных изображений (для начального экрана)
 */
export const preloadCriticalImages = (onProgress, unlockedBackgrounds, unlockedTeeth, unlockedCharacters) => {
  const images = getCriticalImages(unlockedBackgrounds, unlockedTeeth, unlockedCharacters);
  return loadImageBatch(images, onProgress);
};

/**
 * Прелоад важных изображений (в фоне после загрузки критичных)
 */
export const preloadImportantImages = (unlockedBackgrounds, unlockedTeeth, unlockedCharacters) => {
  const images = getImportantImages(unlockedBackgrounds, unlockedTeeth, unlockedCharacters);
  return loadImageBatch(images);
};

/**
 * Прелоад дополнительных изображений (низкий приоритет)
 */
export const preloadAdditionalImages = () => {
  if (additionalImages.length === 0) return Promise.resolve();
  return loadImageBatch(additionalImages);
};