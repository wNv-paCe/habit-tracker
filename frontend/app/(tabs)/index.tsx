import {
  cancelCheckIn,
  createCheckIn,
  getTodayCheckIns,
} from "@/services/checkins";
import { createHabit, deleteHabit, getHabits } from "@/services/habits";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Habit = {
  id: number;
  name: string;
  description: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  start_date: string;
  end_date: string;
  last_checkin?: string | null;
};

export default function HomeScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkinMap, setCheckinMap] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">(
    "DAILY",
  );
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [habitsData, checkinsData] = await Promise.all([
        getHabits(),
        getTodayCheckIns(),
      ]);
      setHabits(habitsData);
      // Have already checkin habit id
      const map = new Map<number, number>();
      checkinsData.forEach((c: any) => map.set(c.habit, c.id));
      setCheckinMap(map);
    } catch (error) {
      console.log("Failed to fetch habits:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add habits
  const handleAddHabit = async () => {
    if (!name) {
      Alert.alert("Error", "Please enter a habit name");
      return;
    }
    try {
      await createHabit({
        name,
        description,
        frequency,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      });
      setModalVisible(false);
      setName("");
      setDescription("");
      setFrequency("DAILY");
      setStartDate(new Date());
      setEndDate(null);
      fetchAll();
    } catch (error) {
      Alert.alert("Error", "Failed to create habit");
    }
  };

  // Check in
  const handleCheckIn = async (habitId: number) => {
    try {
      if (checkinMap.has(habitId)) {
        // Already check in -> Cancel
        const checkinId = checkinMap.get(habitId)!;
        await cancelCheckIn(checkinId);
        setCheckinMap((prev) => {
          const next = new Map(prev);
          next.delete(habitId);
          return next;
        });
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, last_checkin: null } : h,
          ),
        );
      } else {
        // Not check in -> Check in
        const newCheckIn = await createCheckIn(habitId);
        setCheckinMap((prev) => new Map(prev).set(habitId, newCheckIn.id));
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, last_checkin: newCheckIn.checked_at }
              : h,
          ),
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update check-in");
    }
  };

  // Delete habit
  const handleDelete = (habitId: number) => {
    Alert.alert("Delete Habit", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteHabit(habitId);
            setHabits((prev) => prev.filter((h) => h.id !== habitId));
          } catch (error) {
            Alert.alert("Error", "Failed to delete habit");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Header */}
      <View className="flex-row justify-between items-start my-4">
        <Text className="text-2xl font-bold text-gray-800 mb-6">
          Today&apos;s Habits
        </Text>
        <TouchableOpacity
          className="bg-blue-500 rounded-full w-10 h-10 items-center justify-center"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white text-2xl font-bold">+</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      {habits.length > 0 && (
        <Text className="text-sm text-gray-400 mb-4">
          {checkinMap.size} / {habits.length} completed
        </Text>
      )}

      {/* Habit List */}
      {habits.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-base">
            No Habits yet. Add one!
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            let done = false;
            const today = new Date();

            if (item.last_checkin) {
              const lastCheckinDate = new Date(item.last_checkin!);

              if (item.frequency === "DAILY") {
                done = lastCheckinDate.toDateString() === today.toDateString();
              } else if (item.frequency == "WEEKLY") {
                // Monday is the first day
                const day = today.getDay() || 7; // Sunday 0->7
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - day + 1); // Monday
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                done =
                  lastCheckinDate >= startOfWeek &&
                  lastCheckinDate <= endOfWeek;
              } else if (item.frequency === "MONTHLY") {
                const startOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1,
                );
                const endOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  0,
                );
                const lastCheckinDateOnly = new Date(
                  lastCheckinDate.getFullYear(),
                  lastCheckinDate.getMonth(),
                  lastCheckinDate.getDate(),
                );
                done =
                  lastCheckinDateOnly >= startOfMonth &&
                  lastCheckinDateOnly <= endOfMonth;
              }
            }

            return (
              <View
                className="border rounded-xl px-4 py-4 mb-3 flex-row items-center justify-between"
                style={{
                  borderColor: done ? "#86efac" : "#e5e7eb",
                  backgroundColor: done ? "#f0fdf4" : "white",
                }}
              >
                <View className="flex-1 flex-row justify-between items-start">
                  <TouchableOpacity
                    className="flex-1 pr-3"
                    onLongPress={() => handleDelete(item.id)}
                  >
                    <Text
                      className="text-base font-semibold"
                      style={{ color: done ? "#16a34a" : "#1f2937" }}
                    >
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text className="text-sm text-gray-400 mt-1">
                        {item.description}
                      </Text>
                    ) : null}
                    <Text className="text-xs text-blue-400 mt-2">
                      {item.frequency}
                    </Text>
                  </TouchableOpacity>

                  <View className="items-end mr-3">
                    <Text className="text-xs text-black">
                      {item.start_date}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {item.end_date ? item.end_date : "∞"}
                    </Text>
                  </View>
                </View>

                {/* Check-in Button */}
                <TouchableOpacity
                  onPress={() => handleCheckIn(item.id)}
                  className="w-9 h-9 rounded-full items-center justify-center ml-3"
                  style={{ backgroundColor: done ? "#86efac" : "#f3f4f6" }}
                >
                  <Text style={{ color: done ? "#16a34a" : "#9ca3af" }}>
                    {done ? "✓" : "○"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Add Habit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              New Habit
            </Text>

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
              placeholder="Habit name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
              placeholder="Description(optional)"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
              onPress={() => {
                setShowStartPicker(true);
                setShowEndPicker(false);
              }}
            >
              <Text>Start Date: {startDate.toISOString().split("T")[0]}</Text>
            </TouchableOpacity>

            {showStartPicker && Platform.OS === "ios" && (
              <View className="mb-4">
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                  maximumDate={endDate || undefined}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (date) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return;
                      setStartDate(date);
                      if (endDate && endDate < date) setEndDate(null);
                    }
                  }}
                />
                <View className="flex-row justify-between mt-2">
                  <TouchableOpacity
                    className="flex-1 mr-2 bg-gray-200 rounded-lg py-2 items-center"
                    onPress={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      setStartDate(today);
                      if (endDate && endDate < today) setEndDate(null);
                      setShowStartPicker(false);
                    }}
                  >
                    <Text>Set as Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 ml-2 bg-blue-500 rounded-lg py-2 items-center"
                    onPress={() => setShowStartPicker(false)}
                  >
                    <Text className="text-white">Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {showStartPicker && Platform.OS !== "ios" && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="calendar"
                minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                maximumDate={endDate || undefined}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (event.type === "set" && date) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return;
                    setStartDate(date);
                    if (endDate && endDate < date) setEndDate(null);
                  }
                  setShowStartPicker(false);
                }}
              />
            )}

            <TouchableOpacity
              className="border border-gray-300 rounded-xl px-4 py-3 mb-2"
              onPress={() => {
                setShowEndPicker(true);
                setShowStartPicker(false);
              }}
            >
              <Text>
                End Date:{" "}
                {endDate ? endDate.toISOString().split("T")[0] : "Indefinite"}
              </Text>
            </TouchableOpacity>

            {showEndPicker && Platform.OS === "ios" && (
              <View className="mb-4">
                <DateTimePicker
                  value={endDate || startDate || new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date(startDate.setHours(0, 0, 0, 0))}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (date && date >= startDate) setEndDate(date);
                  }}
                />
                <View className="flex-row justify-between mt-2">
                  <TouchableOpacity
                    className="flex-1 mr-2 bg-gray-200 rounded-lg py-2 items-center"
                    onPress={() => {
                      setEndDate(null);
                      setShowEndPicker(false);
                    }}
                  >
                    <Text>Indefinite</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 ml-2 bg-blue-500 rounded-lg py-2 items-center"
                    onPress={() => setShowEndPicker(false)}
                  >
                    <Text className="text-white">Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {showEndPicker && Platform.OS !== "ios" && (
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display="calendar"
                minimumDate={new Date(startDate.setHours(0, 0, 0, 0))}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (event.type === "set" && date && date >= startDate)
                    setEndDate(date);
                  setShowEndPicker(false);
                }}
              />
            )}

            {/* Frequency Selector */}
            <View className="flex-row gap-2 mb-6">
              {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: frequency === f ? "#3b82f6" : "#f3f4f6",
                  }}
                  onPress={() => setFrequency(f)}
                >
                  <Text
                    style={{ color: frequency === f ? "white" : "#6b7280" }}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-blue-500 rounded-xl py-4 items-center mb-6"
              onPress={handleAddHabit}
            >
              <Text className="text-white font-bold text-base">Add Habit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mb-6"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-center text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
