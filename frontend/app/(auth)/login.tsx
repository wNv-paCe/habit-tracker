import { login } from "@/services/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter your username and password");
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      router.replace("/(tabs)"); // Router to homepage when login successful
    } catch (error) {
      Alert.alert("Login Failed", "Incorrect username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-gray-900">
      <Text className="text-4xl font-bold text-center mb-10 text-white">
        Habit Tracker
      </Text>

      <TextInput
        className="border border-gray-400 rounded-xl px-4 py-3 mb-4 text-base text-white"
        placeholder="User Name"
        placeholderTextColor="#6b7280"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        className="border border-gray-400 rounded-xl px-4 py-3 mb-6 text-base text-white"
        placeholder="Password"
        placeholderTextColor="#6b7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="rounded-xl py-4 items-center mb-4"
        style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-base font-bold">
          {loading ? "Loading..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text className="text-center text-blue-500 text-sm">
          Do not have an account? Sign up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
