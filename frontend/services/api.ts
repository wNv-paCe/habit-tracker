import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://10.0.10.61:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
});

// Every request with Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem("refresh_token");
      const res = await axios.post(`${BASE_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess = res.data.access;
      await AsyncStorage.setItem("access_token", newAccess);

      // Using the new Token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

export default api;
