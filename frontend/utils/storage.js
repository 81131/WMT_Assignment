import * as SecureStore from 'expo-secure-store';

export const setItemAsync = async (key, value) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage error', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export const getItemAsync = async (key) => {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage error', e);
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export const deleteItemAsync = async (key) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage error', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};
