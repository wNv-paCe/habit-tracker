import {
  cancelCheckIn,
  createCheckIn,
  getTodayCheckIns,
  toLocalDateString,
} from "@/services/checkins";
import { createHabit, deleteHabit, getHabits } from "@/services/habits";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
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
  checkins: any[];
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

  // CheckIn Modal states
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [checkInMood, setCheckInMood] = useState<
    "GREAT" | "GOOD" | "NEUTRAL" | "BAD"
  >("GOOD");
  const [checkInNote, setCheckInNote] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  // 监听应用切换到前台时刷新
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchAll();
      }
    });
    return () => subscription.remove();
  }, []);

  const isInCurrentPeriod = (dateStr: string, frequency: string): boolean => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (frequency === "DAILY") {
      return dateStr === todayStr;
    } else if (frequency === "WEEKLY") {
      const day = today.getDay() || 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      const sunStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
      return dateStr >= monStr && dateStr <= sunStr;
    } else if (frequency === "MONTHLY") {
      return dateStr.substring(0, 7) === todayStr.substring(0, 7); // 同年同月
    }
    return false;
  };

  const fetchAll = async () => {
    try {
      const [habitsData, checkinsData] = await Promise.all([
        getHabits(),
        getTodayCheckIns(),
      ]);
      setHabits(habitsData);
      // Have already checkin habit id
      const activeHabitIds = new Set(habitsData.map((h: any) => h.id));
      const map = new Map<number, number>();

      habitsData.forEach((habit: any) => {
        if (!activeHabitIds.has(habit.id)) return;
        // Base on frequency to check if check in
        const done = habit.checkins?.some((c: any) => {
          if (c.is_cancelled) return false;
          const cdStr = c.checked_at.substring(0, 10);
          return isInCurrentPeriod(cdStr, habit.frequency);
        });
        if (done) {
          // checkinMap saves the newest check in id
          const latest = habit.checkins
            ?.filter((c: any) => !c.is_cancelled)
            .sort((a: any, b: any) =>
              b.checked_at.localeCompare(a.checked_at),
            )[0];
          if (latest) map.set(habit.id, latest.id);
        }
      });
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
        start_date: toLocalDateString(startDate),
        end_date: endDate ? toLocalDateString(endDate) : undefined,
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
    // Already check in -> Cancel
    if (checkinMap.has(habitId)) {
      const checkinId = checkinMap.get(habitId)!;
      try {
        await cancelCheckIn(checkinId);
        setCheckinMap((prev) => {
          const next = new Map(prev);
          next.delete(habitId);
          return next;
        });
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  last_checkin: null,
                  checkins: h.checkins.filter((c: any) => c.id !== checkinId),
                }
              : h,
          ),
        );
      } catch (error) {
        Alert.alert("Error", "Failed to cancel check-in");
      }
    } else {
      // Not check in -> Open Modal
      setSelectedHabitId(habitId);
      setCheckInMood("GOOD");
      setCheckInNote("");
      setCheckInModalVisible(true);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (selectedHabitId === null) return;

    try {
      const newCheckIn = await createCheckIn(
        selectedHabitId,
        checkInMood || undefined,
        checkInNote || undefined,
      );
      const checkInWithFlag = {
        ...newCheckIn,
        is_cancelled: newCheckIn.is_cancelled ?? false,
      };
      setCheckinMap((prev) =>
        new Map(prev).set(selectedHabitId, checkInWithFlag.id),
      );
      setHabits((prev) =>
        prev.map((h) =>
          h.id === selectedHabitId
            ? {
                ...h,
                last_checkin: checkInWithFlag.checked_at,
                checkins: [...h.checkins, checkInWithFlag],
              }
            : h,
        ),
      );
      setCheckInModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to check in");
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
            setCheckinMap((prev) => {
              const next = new Map(prev);
              next.delete(habitId);
              return next;
            });
          } catch (error) {
            Alert.alert("Error", "Failed to delete habit");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
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
            const done = checkinMap.has(item.id);

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
              <Text>Start Date: {toLocalDateString(startDate)}</Text>
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
                End Date: {endDate ? toLocalDateString(endDate) : "Indefinite"}
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

      {/* CheckIn Modal */}
      <Modal visible={checkInModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-gray-800 mb-6">
              Check In
            </Text>

            <Text className="text-sm text-gray-600 mb-3">
              How are you feeling?
            </Text>
            <View className="flex-row gap-2 mb-6">
              {(["GREAT", "GOOD", "NEUTRAL", "BAD"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: checkInMood === m ? "#3b82f6" : "#f3f4f6",
                  }}
                  onPress={() => setCheckInMood(m)}
                >
                  <Text
                    style={{ color: checkInMood === m ? "white" : "#6b7280" }}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm text-gray-600 mb-3">Note (optional)</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base min-h-[100px]"
              placeholder="Add a note about your check-in..."
              value={checkInNote}
              onChangeText={setCheckInNote}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              className="bg-blue-500 rounded-xl py-4 items-center mb-3"
              onPress={handleConfirmCheckIn}
            >
              <Text className="text-white font-bold text-base">
                Confirm Check In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mb-3"
              onPress={() => setCheckInModalVisible(false)}
            >
              <Text className="text-center text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
