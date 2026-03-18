import api from "./api";

export const getTodayCheckIns = async () => {
  const today = new Date().toISOString().split("T")[0];
  const res = await api.get(`/checkins/?checked_at=${today}`);
  return res.data;
};

export const createCheckIn = async (habitId: number) => {
  const res = await api.post("/checkins/", {
    habit: habitId,
    checked_at: new Date().toISOString(),
  });
  return res.data;
};

export const cancelCheckIn = async (checkinId: number) => {
  await api.post(`/checkins/${checkinId}/cancel/`);
};
