// Stub for @react-native-async-storage/async-storage
// This is used in web environments where React Native modules don't exist
// RainbowKit and other libraries may try to import this, but we replace it with this stub

export default {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {},
};

