import api from "./api";

type CreateHabitParams = {
  name: string;
  description?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  start_date: string;
  end_date?: string;
};

export const getHabits = async () => {
  const response = await api.get("/habits/");
  return response.data;
};

export const createHabit = async (data: CreateHabitParams) => {
  const response = await api.post("/habits/", data);
  return response.data;
};

export const deleteHabit = async (id: number) => {
  await api.delete(`/habits/${id}/`);
};
