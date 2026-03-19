import { BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { getHabits } from "@/services/habits";
import { getCheckInsByDateRange } from "@/services/checkins";
import {
  calculateCurrentStreak,
  calculateBestStreak,
  calculateCompletionRate,
  getDailyCheckInCounts,
} from "@/utils/stats";
import { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const screenWidth = Dimensions.get("window").width;

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // 当页面获得焦点时刷新（解决tab切换不刷新的问题）
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // 使用本地日期字符串格式 YYYY-MM-DD，避免时区问题
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const [habitsData, checkinsData] = await Promise.all([
        getHabits(),
        getCheckInsByDateRange(
          formatDate(startDate),
          formatDate(endDate)
        ),
      ]);

      const activeHabits = habitsData.filter((h: any) => h.is_active);
      console.log("=== Stats Debug ===");
      console.log("Active habits:", activeHabits.map((h: any) => ({ id: h.id, name: h.name })));
      console.log("Check-ins:", checkinsData.map((c: any) => ({ habit: c.habit, date: c.checked_at })));
      console.log("==================");

      setHabits(activeHabits);
      setCheckins(checkinsData);
    } catch (error) {
      console.log("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const currentStreak = calculateCurrentStreak(habits, checkins);
  const bestStreak = calculateBestStreak(habits, checkins);

  // Last 7 days chart data
  const chartEndDate = new Date();
  const chartStartDate = new Date();
  chartStartDate.setDate(chartStartDate.getDate() - 6);
  const dailyCounts = getDailyCheckInCounts(
    checkins,
    chartStartDate,
    chartEndDate
  );
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(chartStartDate);
    d.setDate(d.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const chartData = {
    labels,
    datasets: [{ data: dailyCounts }],
  };

  // 调整图表样式，使其居中
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    barPercentage: 0.6, // 增加柱子宽度
    paddingRight: 20, // 增加右边距
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <Text className="text-2xl font-bold text-gray-800 my-4">
          Statistics
        </Text>

        {/* Streak Cards */}
        <View className="flex-row gap-4 my-4">
          <View className="flex-1 bg-blue-50 rounded-xl p-4">
            <Text className="text-sm text-gray-500">Current Streak</Text>
            <Text className="text-3xl font-bold text-blue-600 mt-1">
              {currentStreak}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">days</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-xl p-4">
            <Text className="text-sm text-gray-500">Best Streak</Text>
            <Text className="text-3xl font-bold text-green-600 mt-1">
              {bestStreak}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">days</Text>
          </View>
        </View>

        {/* 7-Day Chart */}
        <View className="bg-white rounded-xl p-4 my-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-800 mb-4">
            Last 7 Days
          </Text>
          <BarChart
            data={chartData}
            width={screenWidth - 72}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              barPercentage: 0.6, // 增加柱子宽度
              paddingRight: 20, // 增加右边距
            }}
            style={{ borderRadius: 8 }}
          />
        </View>

        {/* Habit Completion Rates */}
        <View className="my-4 mb-8">
          <Text className="text-base font-semibold text-gray-800 mb-4">
            Completion Rate (Last 30 Days)
          </Text>
          {habits.length === 0 ? (
            <Text className="text-gray-400 text-center py-4">
              No habits yet
            </Text>
          ) : (
            habits.map((habit) => {
              const rate = calculateCompletionRate(
                habit,
                checkins,
                new Date(habit.start_date), // 使用习惯的 start_date
                new Date()
              );
              return (
                <View
                  key={habit.id}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <Text className="text-base text-gray-800">{habit.name}</Text>
                  <Text className="text-lg font-semibold text-blue-500">
                    {rate}%
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
