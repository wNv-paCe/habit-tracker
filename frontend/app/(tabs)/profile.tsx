import { logout } from "@/services/auth";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-row justify-between items-start my-4">
        <Text className="text-2xl font-bold text-gray-800 mb-6">Profile</Text>

        <TouchableOpacity
          className="bg-red-500 rounded-xl p-3 items-center justify-center"
          onPress={handleLogout}
        >
          <Text className="text-white text-base font-bold">Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
