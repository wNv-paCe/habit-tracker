import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-row justify-between items-center my-4">
        <Text className="text-2xl font-bold text-gray-800 mb-6">State</Text>
      </View>
    </SafeAreaView>
  );
}
