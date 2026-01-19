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
  return (
    <div style={{ color: 'white', background: 'blue', padding: '100px', fontSize: '50px', position: 'fixed', inset: 0, zIndex: 9999 }}>
      MINIMAL HOME LOADED
    </div>
  );
}
