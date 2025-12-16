/**
 * Форматирование больших чисел в читаемый формат
 * Например: 1000 -> 1K, 1000000 -> 1M
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null) return "0";
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (absNum >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  
  return Math.floor(num).toString();
};

/**
 * Форматирование числа с разделителями тысяч
 * Например: 1000000 -> 1 000 000
 */
export const formatWithSpaces = (num) => {
  if (num === undefined || num === null) return "0";
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

/**
 * Форматирование времени в часы:минуты:секунды
 */
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Форматирование процента
 */
export const formatPercent = (value, total) => {
  if (total === 0) return "0%";
  const percent = (value / total) * 100;
  return `${Math.min(percent, 100).toFixed(0)}%`;
};