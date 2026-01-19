import { useState, useEffect, useCallback, useMemo } from "react";
import { addDays, startOfToday, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { saveToFirebase, loadFromFirebase } from "@/lib/firebaseStorage";
import { AppHeader } from "@/components/countdown/AppHeader";
import { CountdownStats } from "@/components/countdown/CountdownStats";
import { TaskList } from "@/components/countdown/TaskList";
import { ExclusionCalendar } from "@/components/countdown/ExclusionCalendar";
import { differenceInCalendarDays, isSaturday, isSunday } from "date-fns";

// Types
type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
};

type ExcludedDate = {
  date: string; // ISO string
  comment?: string;
};

interface AppData {
  targetDate?: string;
  excludedDates: ExcludedDate[];
  tasks: Array<{
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
  }>;
}

// Hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default function Home() {
  console.log("Home component initializing...");
  const { toast } = useToast();

  // -- Persistent State --
  const [targetDate, setTargetDate] = useLocalStorage<Date | undefined>("daycount-target", undefined);
  const [excludedDates, setExcludedDates] = useLocalStorage<ExcludedDate[]>("daycount-excluded", []);
  const [tasks, setTasks] = useLocalStorage<Task[]>("daycount-tasks", []);
  const [hasLoadedRemote, setHasLoadedRemote] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    state: "idle" | "loading" | "saving" | "saved" | "error";
    message?: string;
    at?: string;
  }>({ state: "idle" });

  const applyRemoteData = useCallback((data: AppData) => {
    if (data.targetDate) {
      setTargetDate(new Date(data.targetDate));
    }
    if (data.excludedDates) {
      setExcludedDates(data.excludedDates);
    }
    if (data.tasks) {
      setTasks(data.tasks.map(t => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined
      })));
    }
  }, [setExcludedDates, setTargetDate, setTasks]);

  // Load from Firebase
  useEffect(() => {
    console.log("Home init effect running...");
    const init = async () => {
      try {
        setSyncStatus({ state: "loading" });
        const data = await loadFromFirebase();
        if (data) {
          applyRemoteData(data);
          setSyncStatus({ state: "saved", at: new Date().toISOString() });
        } else {
          setSyncStatus({ state: "idle", message: "No cloud data found." });
        }
      } catch (error) {
        console.error(error);
        setSyncStatus({ state: "error", message: "Cloud fetch failed." });
      } finally {
        setHasLoadedRemote(true);
      }
    };
    init();
  }, [applyRemoteData]);

  // Sync to Firebase
  useEffect(() => {
    if (!hasLoadedRemote) return;
    const timeoutId = setTimeout(async () => {
      try {
        setSyncStatus({ state: "saving" });
        await saveToFirebase({
          targetDate: targetDate instanceof Date ? targetDate.toISOString() : undefined,
          excludedDates,
          tasks: tasks.map(t => ({
            ...t,
            dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : undefined
          }))
        });
        setSyncStatus({ state: "saved", at: new Date().toISOString() });
      } catch (error) {
        console.error(error);
        setSyncStatus({ state: "error", message: "Cloud sync failed." });
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [targetDate, excludedDates, tasks, hasLoadedRemote]);

  // -- 5 PM Logic --
  const END_OF_DAY_HOUR = 17;
  const getEffectiveToday = useCallback(() => {
    const now = new Date();
    if (now.getHours() >= END_OF_DAY_HOUR) {
      return addDays(startOfToday(), 1);
    }
    return startOfToday();
  }, []);

  const [today, setToday] = useState<Date>(getEffectiveToday);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getEffectiveToday();
      if (next.getTime() !== today.getTime()) {
        setToday(next);
        toast({ title: "Workday Over!", description: "Countdown has shifted to tomorrow." });
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [today, getEffectiveToday, toast]);

  // -- Computed --
  const calendarDaysRemaining = useMemo(() => {
    if (!targetDate) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(targetDate), today) + 1);
  }, [targetDate, today]);

  const workingDaysRemaining = useMemo(() => {
    if (!targetDate) return 0;
    let count = 0;
    const diff = differenceInCalendarDays(new Date(targetDate), today);
    const excludedSet = new Set(excludedDates.map(d => d.date));
    for (let i = 0; i <= diff; i++) {
      const d = addDays(today, i);
      if (!isSaturday(d) && !isSunday(d) && !excludedSet.has(d.toISOString())) {
        count++;
      }
    }
    return count;
  }, [targetDate, today, excludedDates]);

  const taskDates = useMemo(() =>
    tasks.filter(t => t.dueDate && !t.completed).map(t => new Date(t.dueDate!)),
    [tasks]);

  // -- Handlers --
  const handleToggleExclusion = (date: Date) => {
    const iso = date.toISOString();
    setExcludedDates((prev: ExcludedDate[]) =>
      prev.some((d: ExcludedDate) => d.date === iso) ? prev.filter((d: ExcludedDate) => d.date !== iso) : [...prev, { date: iso }]
    );
  };

  const handleUpdateComment = (iso: string, comment: string) => {
    setExcludedDates((prev: ExcludedDate[]) => prev.map((d: ExcludedDate) => d.date === iso ? { ...d, comment } : d));
  };

  const handleReset = () => {
    if (confirm("Reset everything?")) {
      setTargetDate(undefined);
      setExcludedDates([]);
      setTasks([]);
      toast({ title: "Wiped clean", description: "Storage has been cleared." });
    }
  };

  const handleAddTask = (text: string, dueDate?: Date) => {
    setTasks((prev: Task[]) => [...prev, { id: crypto.randomUUID(), text, completed: false, dueDate }]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
  };

  console.log("Home component rendering JSX...");
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <AppHeader
          today={today}
          targetDate={targetDate ? new Date(targetDate) : undefined}
          onTargetDateSelect={setTargetDate}
          syncStatus={syncStatus}
          onReset={handleReset}
        />

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-10">
            <CountdownStats
              hasTargetDate={!!targetDate}
              calendarDays={calendarDaysRemaining}
              workingDays={workingDaysRemaining}
            />

            <ExclusionCalendar
              today={today}
              targetDate={targetDate ? new Date(targetDate) : undefined}
              excludedDates={excludedDates}
              taskDates={taskDates}
              onToggleExclusion={handleToggleExclusion}
              onUpdateComment={handleUpdateComment}
            />
          </div>

          <aside className="lg:col-span-5 bg-card/20 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl h-fit">
            <TaskList
              today={today}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          </aside>
        </main>

        <footer className="pt-12 border-t border-white/5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Daily reset at {END_OF_DAY_HOUR}:00 PM
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/40 font-medium">
            Standardized on Firebase Cloud Storage
          </p>
        </footer>
      </div>
    </div>
  );
}
