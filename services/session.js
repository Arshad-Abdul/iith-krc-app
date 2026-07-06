import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "koha_session";

// expo-secure-store is native-only (Keychain/Keystore) and has no usable web
// implementation in this SDK version. Fall back to AsyncStorage on web.
const store = Platform.OS === "web" ? AsyncStorage : null;

export const saveSession = async ({ token, patron }) => {
  const value = JSON.stringify({ token, patron });
  if (store) {
    await store.setItem(SESSION_KEY, value);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  }
};

export const getSession = async () => {
  const raw = store
    ? await store.getItem(SESSION_KEY)
    : await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  if (store) {
    await store.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
};
