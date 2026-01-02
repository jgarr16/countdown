import { useState } from "react";
import { format, differenceInCalendarDays, isSaturday, isSunday, addDays, startOfToday } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Briefcase, Trash2, RotateCcw, Plus, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
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
  const [isExclusionsOpen, setIsExclusionsOpen] = useState(false);
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
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Calendar Days</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <div className="text-5xl font-bold tracking-tighter">
                    {safeTargetDate ? Math.max(0, calendarDaysRemaining) : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider flex items-center justify-center gap-2">
                    <Briefcase className="h-4 w-4" /> Working Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <div className="text-5xl font-bold text-primary tracking-tighter">
                    {safeTargetDate ? Math.max(0, workingDaysRemaining) : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Section */}
            <Card className="shadow-sm border-border/60 overflow-hidden">
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Calendar</CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="flex justify-center w-full overflow-hidden">
                  <div className="w-full max-w-sm border rounded-lg p-2 bg-card">
                    <div className="[&_.rdp]:!m-0 [&_.rdp-months]:!justify-center [&_.rdp-month]:!w-full [&_.rdp-table]:!w-full [&_.rdp-cell]:!p-0 [&_.rdp-button]:!h-10 [&_.rdp-button]:!w-full [&_.rdp-head_cell]:!font-bold [&_.rdp-day]:!h-10 [&_.rdp-day]:!w-full [&_.rdp-tbody]:!h-auto [&_.rdp-table]:!table-fixed [&_.rdp-table]:!border-collapse [&_.rdp-month]:!space-y-0">
                      <Calendar
                        mode="multiple"
                        selected={excludedDatesObj}
                        onSelect={(_, date) => toggleExclusion(date)}
                        className="w-full h-auto"
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Separate Exclusions Section */}
            {excludedDates.length > 0 && (
              <Collapsible
                open={isExclusionsOpen}
                onOpenChange={setIsExclusionsOpen}
                className="w-full"
              >
                <Card className="shadow-sm border-border/60 animate-in fade-in slide-in-from-bottom-2">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center relative">
                        <CardTitle className="text-lg">Excluded Dates</CardTitle>
                        <div className="absolute right-0">
                          {isExclusionsOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pb-6">
                      <div className="flex flex-col gap-2">
                        {excludedDatesObj.sort((a,b) => a.getTime() - b.getTime()).map((date) => (
                          <div key={date.toISOString()} className="flex items-center justify-between bg-secondary/50 text-secondary-foreground px-4 py-3 rounded-xl border border-border/50 transition-all hover:bg-secondary/80">
                            <span className="font-semibold text-base">{format(date, "MMM d, yyyy")}</span>
                            <button 
                              onClick={() => toggleExclusion(date)} 
                              className="p-2 -mr-1 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>

          {/* Right Column: Tasks (Span 5) */}
          <div className="w-full md:col-span-5 md:sticky md:top-8">
            <Card className="shadow-sm border-border/60 flex flex-col min-h-[500px]">
              <CardHeader className="pb-4 border-b border-border/40 bg-muted/20 text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> 
                  Tasks
                </CardTitle>
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
