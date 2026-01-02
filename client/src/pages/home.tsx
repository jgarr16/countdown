import { useState, useEffect } from "react";
import { format, differenceInCalendarDays, isSaturday, isSunday, addDays, isSameDay, startOfToday } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Briefcase, Trash2, RotateCcw, Plus, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// Types
type Task = {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
};

// Hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default function Home() {
  const { toast } = useToast();
  
  // -- Persistent State --
  const [targetDate, setTargetDate] = useLocalStorage<Date | undefined>("daycount-target", undefined);
  // Store excluded dates as ISO strings
  const [excludedDates, setExcludedDates] = useLocalStorage<string[]>("daycount-excluded", []);
  const [tasks, setTasks] = useLocalStorage<Task[]>("daycount-tasks", []);

  // -- UI State --
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);

  // -- Computed Values --
  const today = startOfToday();
  const safeTargetDate = targetDate ? new Date(targetDate) : undefined;
  
  const calendarDaysRemaining = safeTargetDate 
    ? differenceInCalendarDays(safeTargetDate, today) 
    : 0;

  const isFuture = calendarDaysRemaining >= 0;

  // Calculate working days
  const calculateWorkingDays = () => {
    if (!safeTargetDate || calendarDaysRemaining < 0) return 0;
    
    let workingDays = 0;
    let current = today;
    
    // Simple loop for day counting (efficient enough for reasonable ranges)
    // We iterate up to but not including the target date if it's strictly "between", 
    // but usually "days until" includes the logic of "how many work days left".
    // Let's assume inclusive of today if work hasn't finished, and inclusive of target? 
    // Usually "5 days until Friday" implies Monday-Friday are the days.
    // Let's count inclusive of Today -> Target Date.
    
    const daysDiff = differenceInCalendarDays(safeTargetDate, today);
    
    for (let i = 0; i <= daysDiff; i++) {
      const dayToCheck = addDays(today, i);
      const isWeekend = isSaturday(dayToCheck) || isSunday(dayToCheck);
      const isExcluded = excludedDates.includes(dayToCheck.toISOString());
      
      if (!isWeekend && !isExcluded) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const workingDaysRemaining = calculateWorkingDays();

  // -- Handlers --

  const toggleExclusion = (date: Date) => {
    const isoDate = date.toISOString();
    if (excludedDates.includes(isoDate)) {
      setExcludedDates(excludedDates.filter(d => d !== isoDate));
    } else {
      setExcludedDates([...excludedDates, isoDate]);
    }
  };

  const resetAll = () => {
    if (confirm("Are you sure you want to reset all data, including the target date, holidays, and tasks?")) {
      setTargetDate(undefined);
      setExcludedDates([]);
      setTasks([]);
      toast({ title: "Reset complete", description: "All settings and tasks have been cleared." });
    }
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { 
      id: crypto.randomUUID(), 
      text: newTaskText, 
      completed: false,
      dueDate: newTaskDate
    }]);
    setNewTaskText("");
    setNewTaskDate(undefined);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Convert string dates back to Date objects for the calendar
  const excludedDatesObj = excludedDates.map(d => new Date(d));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary">Countdown!</h1>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !targetDate && "text-muted-foreground"
                )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(new Date(targetDate), "PPP") : <span>Pick a target date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={safeTargetDate}
                  onSelect={(date) => setTargetDate(date)}
                  disabled={(date) => date < today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {targetDate && (
              <Button variant="ghost" size="icon" onClick={resetAll} title="Reset All">
                <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            )}
          </div>
        </header>

        {/* Main Grid */}
        <div className="flex flex-col md:grid md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Stats & Setup (Span 7) */}
          <div className="w-full md:col-span-7 space-y-8 min-w-0">
            
            {/* Countdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="bg-card shadow-sm border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Calendar Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold tracking-tight">
                    {safeTargetDate ? Math.max(0, calendarDaysRemaining) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total days remaining</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Working Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary tracking-tight">
                    {safeTargetDate ? Math.max(0, workingDaysRemaining) : "—"}
                  </div>
                  <p className="text-xs text-primary/70 mt-1">Excluding weekends & holidays</p>
                </CardContent>
              </Card>
            </div>

            {/* Calendar & Exclusions */}
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Calendar & Exclusions</CardTitle>
                <CardDescription>
                  Select dates below to mark them as non-working days.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex justify-center">
                  <Calendar
                    mode="multiple"
                    selected={excludedDatesObj}
                    onSelect={(_, date) => toggleExclusion(date)}
                    className="rounded-md border p-3 w-full max-w-full sm:max-w-md pointer-events-auto"
                    disabled={(date) => date < today}
                    modifiers={{
                      weekend: (date) => isSaturday(date) || isSunday(date)
                    }}
                    modifiersStyles={{
                      weekend: { color: "var(--muted-foreground)", opacity: 0.5 }
                    }}
                    showOutsideDays={false}
                  />
                </div>
                
                {excludedDates.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Excluded Dates</h4>
                    <div className="flex flex-wrap gap-2">
                      {excludedDatesObj.sort((a,b) => a.getTime() - b.getTime()).map((date) => (
                        <div key={date.toISOString()} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full text-xs font-medium animate-in zoom-in-50 duration-200">
                          {format(date, "MMM d")}
                          <button onClick={() => toggleExclusion(date)} className="ml-1 hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Tasks (Span 5) */}
          <div className="w-full md:col-span-5 md:sticky md:top-8">
            <Card className="shadow-sm border-border/60 flex flex-col min-h-[500px]">
              <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> 
                  Session Tasks
                </CardTitle>
                <CardDescription>
                  Quick checklist for your current session.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 flex flex-col min-h-[300px]">
                 <ScrollArea className="flex-1 p-4">
                   {tasks.length === 0 ? (
                     <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/50 text-center px-4">
                       <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                       <p className="text-sm">No tasks yet. Add one below!</p>
                     </div>
                   ) : (
                     <ul className="space-y-3">
                       {tasks
                         .sort((a, b) => {
                           if (!a.dueDate && !b.dueDate) return 0;
                           if (!a.dueDate) return 1;
                           if (!b.dueDate) return -1;
                           return a.dueDate.getTime() - b.dueDate.getTime();
                         })
                         .map(task => (
                         <li key={task.id} className="group flex items-start gap-3 bg-card p-3 rounded-lg border border-transparent hover:border-border/50 transition-all">
                            <Checkbox 
                              checked={task.completed} 
                              onCheckedChange={() => toggleTask(task.id)} 
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm leading-tight break-words transition-all",
                                task.completed && "text-muted-foreground line-through decoration-muted-foreground/50"
                              )}>
                                {task.text}
                              </p>
                              {task.dueDate && (
                                <p className="text-[10px] mt-1 font-medium text-primary flex items-center gap-1">
                                  <CalendarIcon className="h-2.5 w-2.5" />
                                  Due: {format(task.dueDate, "MMM d")} 
                                  ({differenceInCalendarDays(task.dueDate, today)} days left)
                                </p>
                              )}
                            </div>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                         </li>
                       ))}
                     </ul>
                   )}
                 </ScrollArea>
                 
                 <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm space-y-3">
                   <div className="flex gap-2">
                     <Input 
                       placeholder="Add a new task..." 
                       value={newTaskText}
                       onChange={(e) => setNewTaskText(e.target.value)}
                       className="flex-1"
                     />
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className={cn(!newTaskDate && "text-muted-foreground")}>
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={newTaskDate}
                            onSelect={setNewTaskDate}
                            disabled={(date) => date < today}
                            initialFocus
                          />
                        </PopoverContent>
                     </Popover>
                     <Button type="submit" size="icon" disabled={!newTaskText.trim()} onClick={addTask}>
                       <Plus className="h-4 w-4" />
                     </Button>
                   </div>
                   {newTaskDate && (
                     <p className="text-[10px] font-medium text-primary flex items-center gap-1 animate-in slide-in-from-top-1">
                       <CalendarIcon className="h-2.5 w-2.5" />
                       Due date set for {format(newTaskDate, "MMM d")}
                     </p>
                   )}
                 </div>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}
