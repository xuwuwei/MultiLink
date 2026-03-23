import CryptoJS from 'crypto-js';
import { connectionService } from './connectionService';
import { StorageService } from './platformService';

export interface Device {
  id: string;
  name: string;
  ip: string;
  port?: string;
  color: string;
  isOnline: boolean;
}

// 历史IP地址管理
const IP_HISTORY_KEY = 'ip_history';
const MAX_IP_HISTORY = 10;

export interface IpHistoryItem {
  ip: string;
  port: string;
  lastUsed: number;
}

export const getIpHistory = (): IpHistoryItem[] => {
  const saved = StorageService.getItem(IP_HISTORY_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      // 按最后使用时间排序，最新的在前
      return parsed.sort((a, b) => b.lastUsed - a.lastUsed);
    }
  } catch (_) {}
  return [];
};

export const addToIpHistory = (ip: string, port: string): void => {
  const history = getIpHistory();
  const existingIndex = history.findIndex(item => item.ip === ip && item.port === port);

  if (existingIndex >= 0) {
    // 更新已存在的记录
    history[existingIndex].lastUsed = Date.now();
  } else {
    // 添加新记录
    history.push({ ip, port, lastUsed: Date.now() });
  }

  // 限制历史记录数量，保留最新的
  const trimmed = history
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, MAX_IP_HISTORY);

  StorageService.setItem(IP_HISTORY_KEY, JSON.stringify(trimmed));
};

const COLORS = [
  '#34D399', // Emerald
  '#60A5FA', // Blue
  '#F472B6', // Pink
  '#A78BFA', // Violet
  '#FBBF24', // Amber
  '#FB7185', // Rose
  '#22D3EE', // Cyan
  '#818CF8', // Indigo
  '#C084FC', // Purple
  '#FCA5A5', // Light Red
];

export const generateDeviceId = (name: string, ip: string, port?: string): number => {
  const hash = CryptoJS.MD5(name + ip + (port || '')).toString();
  const num = parseInt(hash.substring(0, 8), 16);
  return num % 10;
};

export const getDeviceColor = (id: number): string => {
  return COLORS[id % COLORS.length];
};

export const createDevice = (name: string, ip: string, port?: string): Device => {
  const colorId = generateDeviceId(name, ip, port);
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    ip,
    port,
    color: getDeviceColor(colorId),
    isOnline: false
  };
};

export const testConnection = async (ip: string, port: string): Promise<boolean> => {
  const portNum = parseInt(port, 10) || 8333;
  const tempId = `test-${ip}-${port}`;
  const result = await connectionService.connect(tempId, ip, portNum);
  if (result.success) {
    await connectionService.disconnect(tempId);
    return true;
  }
  return false;
};
