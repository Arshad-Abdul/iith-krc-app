import AsyncStorage from "@react-native-async-storage/async-storage";

const TTL = 24 * 60 * 60 * 1000; // 24h

export const saveCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
};

export const getCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, ts, stale: Date.now() - ts > TTL };
  } catch {
    return null;
  }
};
