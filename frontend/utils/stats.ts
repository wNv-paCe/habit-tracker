// Date formate
const toLocalStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCheckinDateStr = (checkedAt: string): string => {
  return checkedAt.substring(0, 10); // "2026-3-18T00:00:00Z" -> "2026-03-18"
};

// Calculate daily check-in counts for bar chart (last 7 days)
export const getDailyCheckInCounts = (
  checkins: any[],
  startDate: Date,
  endDate: Date,
): number[] => {
  const days =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const counts = new Array(days).fill(0);
  checkins.forEach((c) => {
    const checkinStr = getCheckinDateStr(c.checked_at);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (toLocalStr(d) === checkinStr) {
        counts[i]++;
        break;
      }
    }
  });
  return counts;
};

// Helper
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 0 - 7
  d.setDate(d.getDate() - day + 1); // Monday as start
  d.setHours(0, 0, 0, 0);
  return d;
}

// Calculate completion rate for a habit over date range
export const calculateCompletionRate = (
  habit: any,
  checkins: any[],
  startDate: Date,
  endDate: Date,
): number => {
  console.log("=== calculateCompletionRate ===");
  console.log("  habit:", {
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
  });
  console.log("  startDate:", startDate.toDateString());
  console.log("  endDate:", endDate.toDateString());
  console.log("  checkins count:", checkins.length);

  const habitCheckins = checkins.filter(
    (c) => c.habit === habit.id && !c.is_cancelled,
  );

  console.log("  habitCheckins count:", habitCheckins.length);

  const habitStartStr = habit.start_date.substring(0, 10);
  const habitEndStr = habit.end_date ? habit.end_date.substring(0, 10) : null;

  const startStr = toLocalStr(startDate);
  const endStr = toLocalStr(endDate);

  const effectiveStartStr = habitStartStr > startStr ? habitStartStr : startStr;
  const effectiveEndStr =
    habitEndStr && habitEndStr < endStr ? habitEndStr : endStr;

  console.log("  effectiveStartStr:", effectiveStartStr);
  console.log("  effectiveEndStr:", effectiveEndStr);

  if (effectiveStartStr > effectiveEndStr) {
    console.log("  effectiveStart > effectiveEnd, returning 0");
    return 0;
  }

  let totalPeriods = 0;
  let completedPeriods = 0;

  if (habit.frequency === "DAILY") {
    // By day
    const current = new Date(effectiveStartStr + "T12:00:00");

    while (toLocalStr(current) <= effectiveEndStr) {
      totalPeriods++;
      const dayStr = toLocalStr(current);
      const done = habitCheckins.some(
        (c) => getCheckinDateStr(c.checked_at) === dayStr,
      );
      if (done) completedPeriods++;
      current.setDate(current.getDate() + 1);
    }
  } else if (habit.frequency === "WEEKLY") {
    // By week
    let weekStart = getStartOfWeek(new Date(effectiveStartStr + "T12:00:00"));
    while (toLocalStr(weekStart) <= effectiveEndStr) {
      const weekStartStr = toLocalStr(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = toLocalStr(weekEnd);

      // This week is not in the range
      if (weekEndStr >= effectiveStartStr && weekStartStr <= effectiveEndStr) {
        totalPeriods++;
        const done = habitCheckins.some((c) => {
          const cdStr = getCheckinDateStr(c.checked_at);
          return cdStr >= weekStartStr && cdStr <= weekEndStr;
        });
        if (done) completedPeriods++;
      }

      weekStart.setDate(weekStart.getDate() + 7);
    }
  } else if (habit.frequency === "MONTHLY") {
    // By month
    const startYear = parseInt(effectiveStartStr.substring(0, 4));
    const startMonth = parseInt(effectiveStartStr.substring(5, 7)) - 1;

    let current = new Date(startYear, startMonth, 1, 12, 0, 0);

    while (toLocalStr(current) <= effectiveEndStr) {
      const monthStartStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        0,
      );
      const monthEndStr = toLocalStr(lastDay);

      if (
        monthEndStr >= effectiveStartStr &&
        monthStartStr <= effectiveEndStr
      ) {
        totalPeriods++;
        const done = habitCheckins.some((c) => {
          const cdStr = getCheckinDateStr(c.checked_at);
          return cdStr >= monthStartStr && cdStr <= monthEndStr;
        });
        if (done) completedPeriods++;
      }

      current = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1,
        12,
        0,
        0,
      );
    }
  }

  const rate =
    totalPeriods > 0 ? Math.round((completedPeriods / totalPeriods) * 100) : 0;

  console.log("  totalPeriods:", totalPeriods);
  console.log("  completedPeriods:", completedPeriods);
  console.log("  completion rate:", rate + "%");
  console.log("============================");

  return rate;
};

// Calculate current streak (consecutive days with ALL habits completed)
export const calculateCurrentStreak = (
  habits: any[],
  checkins: any[],
  today: Date = new Date(),
): number => {
  const dailyHabits = habits.filter(
    (h) => h.is_active && h.frequency === "DAILY",
  );
  if (dailyHabits.length === 0) return 0;

  console.log("=== calculateCurrentStreak ===");
  console.log(
    "  activeHabits:",
    dailyHabits.map((h) => ({ id: h.id, name: h.name })),
  );

  let streak = 0;
  let checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    const dateStr = toLocalStr(checkDate);

    const allCompleted = dailyHabits.every((habit) => {
      return checkins.some(
        (c) =>
          c.habit === habit.id &&
          !c.is_cancelled &&
          getCheckinDateStr(c.checked_at) === dateStr,
      );
    });

    console.log(`${dateStr}: allCompleted=${allCompleted}`);
    if (allCompleted) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  console.log(`  final streak: ${streak}`);
  console.log("============================");
  return streak;
};

// Calculate best streak (longest consecutive days with ALL habits completed)
export const calculateBestStreak = (habits: any[], checkins: any[]): number => {
  const dailyHabits = habits.filter(
    (h) => h.is_active && h.frequency === "DAILY",
  );
  if (dailyHabits.length === 0) return 0;
  if (checkins.length === 0) return 0;

  const dailyCheckins = checkins.filter(
    (c) => dailyHabits.some((h) => h.id === c.habit) && !c.is_cancelled,
  );
  if (dailyCheckins.length === 0) return 0;

  const allDates = dailyCheckins
    .map((c) => getCheckinDateStr(c.checked_at))
    .sort();
  const firstDate = allDates[0];
  const lastDate = allDates[allDates.length - 1];

  // 从第一天到最后一天逐天检查
  let bestStreak = 0;
  let currentStreak = 0;

  const current = new Date(firstDate + "T12:00:00");
  const end = new Date(lastDate + "T12:00:00");

  while (toLocalStr(current) <= toLocalStr(end)) {
    const dateStr = toLocalStr(current);

    const allCompleted = dailyHabits.every((habit) =>
      dailyCheckins.some(
        (c) =>
          c.habit === habit.id && getCheckinDateStr(c.checked_at) === dateStr,
      ),
    );

    if (allCompleted) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    current.setDate(current.getDate() + 1);
  }

  return bestStreak;
};
