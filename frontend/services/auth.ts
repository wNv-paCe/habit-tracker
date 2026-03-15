import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

export const register = async (
  username: string,
  password: string,
  email?: string,
) => {
  const response = await api.post("/auth/register/", {
    username,
    password,
    email,
  });
  return response.data;
};

export const login = async (username: string, password: string) => {
  const response = await api.post("/auth/login/", { username, password });
  const { access, refresh } = response.data;

  // Save Token to local
  await AsyncStorage.setItem("access_token", access);
  await AsyncStorage.setItem("refresh_token", refresh);

  return response.data;
};

export const logout = async () => {
  await AsyncStorage.removeItem("access_token");
  await AsyncStorage.removeItem("refresh_token");
};

export const getToken = async () => {
  return await AsyncStorage.getItem("access_token");
};

export const isLoggedIn = async () => {
  const token = await AsyncStorage.getItem("access_token");
  return !!token; //token exists return true, else false
};
