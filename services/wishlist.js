import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "krc_wishlist_v1";

export const getWishlist = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const addToWishlist = async (book) => {
  const list = await getWishlist();
  if (!list.find((b) => b.biblio_id === book.biblio_id)) {
    list.unshift({ ...book, savedAt: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  }
};

export const removeFromWishlist = async (biblioId) => {
  const list = await getWishlist();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((b) => b.biblio_id !== biblioId)));
};

export const isInWishlist = async (biblioId) => {
  const list = await getWishlist();
  return list.some((b) => b.biblio_id === biblioId);
};
