import { register } from "@/services/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      await register(username, password, email);
      Alert.alert("Success", "Registration successful! Please log in");
      router.replace("/(auth)/login");
    } catch (error: any) {
      console.log("Registration Failed", error);
      Alert.alert(
        "Registration Failed",
        error?.message || JSON.stringify(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-4xl font-bold text-center mb-10 text-gray-800">
        Sign Up
      </Text>

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="User name"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
        placeholder="Email (optional)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="rounded-xl py-4 items-center mb-4"
        style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-base font-bold">
          {loading ? "Registering..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text className="text-center text-blue-500 text-sm">
          Already have an account? Log in
        </Text>
      </TouchableOpacity>
    </View>
  );
}
