import api from "./api";

// 使用本地日期字符串格式 YYYY-MM-DD
export const toLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayCheckIns = async () => {
  const today = toLocalDateString();
  const res = await api.get(`/checkins/?checked_at=${today}`);
  return res.data;
};

export const createCheckIn = async (
  habitId: number,
  mood?: string,
  note?: string
) => {
  const res = await api.post("/checkins/", {
    habit: habitId,
    checked_at: toLocalDateString(),
    mood,
    note,
  });
  return res.data;
};

export const cancelCheckIn = async (checkinId: number) => {
  await api.post(`/checkins/${checkinId}/cancel/`);
};

export const getCheckInsByDateRange = async (
  startDate: string,
  endDate: string
) => {
  const res = await api.get(
    `/checkins/?start_date=${startDate}&end_date=${endDate}`
  );
  return res.data;
};
