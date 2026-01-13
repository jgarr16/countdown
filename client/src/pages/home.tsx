import { useState, useEffect, useCallback } from "react";
import { format, differenceInCalendarDays, isSaturday, isSunday, addDays, startOfToday, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Briefcase, Trash2, RotateCcw, Plus, CheckCircle2, ChevronDown, ChevronUp, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { saveToGitHub, loadFromGitHub, setGitHubToken, getGitHubToken } from "@/lib/githubStorage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

// Hook for localStorage persistence with GitHub sync
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      // Migration for excluded dates (from string[] to ExcludedDate[])
      if (key === "daycount-excluded") {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed.map((d: string) => ({ date: d })) as unknown as T;
        }
      }
      return JSON.parse(item);
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
  const [excludedDates, setExcludedDates] = useLocalStorage<ExcludedDate[]>("daycount-excluded", []);
  const [tasks, setTasks] = useLocalStorage<Task[]>("daycount-tasks", []);
  const [isSyncing, setIsSyncing] = useState(false);
  const [githubToken, setGithubTokenState] = useState<string | null>(() => getGitHubToken());
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  // Load data from GitHub on mount
  useEffect(() => {
    const loadFromGitHubAsync = async () => {
      if (!githubToken) return;
      
      try {
        setIsSyncing(true);
        const data = await loadFromGitHub();
        if (data) {
          // Only load if we don't have local data (to avoid overwriting)
          const currentTargetDate = localStorage.getItem("daycount-target");
          const currentExcluded = localStorage.getItem("daycount-excluded");
          const currentTasks = localStorage.getItem("daycount-tasks");
          
          if (!currentTargetDate && data.targetDate) {
            setTargetDate(new Date(data.targetDate));
          }
          if ((!currentExcluded || currentExcluded === "[]") && data.excludedDates.length > 0) {
            setExcludedDates(data.excludedDates);
          }
          if ((!currentTasks || currentTasks === "[]") && data.tasks.length > 0) {
            setTasks(data.tasks.map(t => ({
              ...t,
              dueDate: t.dueDate ? new Date(t.dueDate) : undefined
            })));
          }
        }
      } catch (error) {
        console.error("Failed to load from GitHub:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    
    loadFromGitHubAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Sync to GitHub when data changes (debounced)
  useEffect(() => {
    if (!githubToken) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        setIsSyncing(true);
        await saveToGitHub({
          targetDate: targetDate?.toISOString(),
          excludedDates,
          tasks: tasks.map(t => ({
            ...t,
            dueDate: t.dueDate?.toISOString()
          }))
        });
      } catch (error) {
        console.error("Failed to save to GitHub:", error);
      } finally {
        setIsSyncing(false);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [targetDate, excludedDates, tasks, githubToken]);

  const handleSetToken = () => {
    if (tokenInput.trim()) {
      setGitHubToken(tokenInput.trim());
      setGithubTokenState(tokenInput.trim());
      setShowTokenDialog(false);
      setTokenInput("");
      toast({ title: "GitHub sync enabled", description: "Your data will now sync across devices." });
    }
  };

  const handleRemoveToken = () => {
    setGitHubToken(null);
    setGithubTokenState(null);
    toast({ title: "GitHub sync disabled", description: "Data will only be stored locally." });
  };

  // -- UI State --
  const [isExclusionsOpen, setIsExclusionsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
  
  // The day ends at 5 PM local time - after 5 PM, the day is considered "over"
  const END_OF_DAY_HOUR = 17; // 5 PM
  
  // Get the effective "today" - after 5 PM, the current day is over so we use tomorrow
  const getEffectiveToday = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= END_OF_DAY_HOUR) {
      // After 5 PM - day is over, use tomorrow
      return addDays(startOfToday(), 1);
    }
    return startOfToday();
  }, []);
  
  // State to trigger re-renders when the day changes at 5 PM
  const [effectiveToday, setEffectiveToday] = useState<Date>(getEffectiveToday);
  
  // Set up a timer to update the effective day at 5 PM
  useEffect(() => {
    const checkAndUpdate = () => {
      const newEffectiveToday = getEffectiveToday();
      if (newEffectiveToday.getTime() !== effectiveToday.getTime()) {
        setEffectiveToday(newEffectiveToday);
        toast({
          title: "Day complete!",
          description: "The workday has ended. Countdown updated.",
        });
      }
    };
    
    // Calculate time until next 5 PM
    const now = new Date();
    const currentHour = now.getHours();
    let next5PM: Date;
    
    if (currentHour >= END_OF_DAY_HOUR) {
      // Already past 5 PM today, next trigger is tomorrow at 5 PM
      next5PM = setMilliseconds(setSeconds(setMinutes(setHours(addDays(startOfToday(), 1), END_OF_DAY_HOUR), 0), 0), 0);
    } else {
      // Before 5 PM, next trigger is today at 5 PM
      next5PM = setMilliseconds(setSeconds(setMinutes(setHours(startOfToday(), END_OF_DAY_HOUR), 0), 0), 0);
    }
    
    const msUntil5PM = next5PM.getTime() - now.getTime();
    
    // Set timeout for the next 5 PM transition
    const timeoutId = setTimeout(() => {
      checkAndUpdate();
    }, msUntil5PM);
    
    // Also check every minute in case the user leaves the tab open
    const intervalId = setInterval(checkAndUpdate, 60000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [effectiveToday, getEffectiveToday, toast]);

  // -- Computed Values --
  const today = effectiveToday; // Use effective today (accounts for 5 PM cutoff)
  const safeTargetDate = targetDate ? new Date(targetDate) : undefined;
  
  // Calendar days remaining (inclusive of both today and target day)
  const calendarDaysRemaining = safeTargetDate 
    ? differenceInCalendarDays(safeTargetDate, today) + 1
    : 0;

  const calculateWorkingDays = () => {
    if (!safeTargetDate || calendarDaysRemaining < 0) return 0;
    let workingDays = 0;
    const daysDiff = differenceInCalendarDays(safeTargetDate, today);
    const excludedISOStrings = excludedDates.map(d => d.date);
    for (let i = 0; i <= daysDiff; i++) {
      const dayToCheck = addDays(today, i);
      const isWeekend = isSaturday(dayToCheck) || isSunday(dayToCheck);
      const isExcluded = excludedISOStrings.includes(dayToCheck.toISOString());
      if (!isWeekend && !isExcluded) workingDays++;
    }
    return workingDays;
  };

  const workingDaysRemaining = calculateWorkingDays();

  // -- Handlers --
  const toggleExclusion = (date: Date) => {
    const isoDate = date.toISOString();
    if (excludedDates.some(d => d.date === isoDate)) {
      setExcludedDates(excludedDates.filter(d => d.date !== isoDate));
    } else {
      setExcludedDates([...excludedDates, { date: isoDate }]);
    }
  };

  const updateExclusionComment = (isoDate: string, comment: string) => {
    setExcludedDates(excludedDates.map(d => d.date === isoDate ? { ...d, comment } : d));
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

  const excludedDatesObj = excludedDates.map(d => new Date(d.date));
  const taskDates = tasks
    .filter(t => t.dueDate && !t.completed)
    .map(t => new Date(t.dueDate!));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-primary">Countdown!</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" title={githubToken ? "GitHub sync enabled" : "Enable GitHub sync"}>
                  {githubToken ? (
                    <>
                      <Cloud className={cn("h-4 w-4", isSyncing && "animate-pulse")} />
                      <span>Sync</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="h-4 w-4" />
                      <span>Sync</span>
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>GitHub Sync Settings</DialogTitle>
                  <DialogDescription>
                    Enable GitHub sync to persist your data across devices. Your data will be stored in a private GitHub Gist.
                  </DialogDescription>
                </DialogHeader>
                {githubToken ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Cloud className="h-4 w-4 text-primary" />
                      <span>GitHub sync is enabled</span>
                    </div>
                    <Button variant="destructive" onClick={handleRemoveToken} className="w-full">
                      Disable GitHub Sync
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      To create a GitHub Personal Access Token:
                      <br />
                      1. Go to GitHub Settings → Developer settings → Personal access tokens
                      <br />
                      2. Generate a new token with the "gist" scope
                      <br />
                      3. Paste it here to enable sync
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token">GitHub Personal Access Token</Label>
                      <Input
                        id="token"
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSetToken} className="w-full" disabled={!tokenInput.trim()}>
                      Enable Sync
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      To create a GitHub Personal Access Token:
                      <br />
                      1. Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">GitHub Settings → Developer settings → Personal access tokens</a>
                      <br />
                      2. Click "Generate new token (classic)"
                      <br />
                      3. Select the "gist" scope
                      <br />
                      4. Copy the token and paste it above
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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

        {/* Simplified Single Column Layout */}
        <div className="flex flex-col gap-8">
          {/* Top Section: Stats */}
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
                        weekend: (date) => isSaturday(date) || isSunday(date),
                        tasked: taskDates,
                        expired: (date) => date < today
                      }}
                      modifiersClassNames={{
                        expired: "calendar-day-expired"
                      }}
                      modifiersStyles={{
                        weekend: { color: "var(--muted-foreground)", opacity: 0.5 },
                        tasked: { 
                          borderBottom: "2px solid var(--primary)",
                          borderRadius: "0px"
                        }
                      }}
                      showOutsideDays={false}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Stack */}
          <div className="space-y-6">
            {/* Exclusions Section */}
            {excludedDates.length > 0 && (
              <Collapsible open={isExclusionsOpen} onOpenChange={setIsExclusionsOpen} className="w-full">
                <Card className="shadow-sm border-border/60">
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
                      <div className="flex flex-col gap-4">
                        {[...excludedDates].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item) => (
                          <div key={item.date} className="space-y-2 bg-secondary/30 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base">{format(new Date(item.date), "MMM d, yyyy")}</span>
                              <button onClick={() => toggleExclusion(new Date(item.date))} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                            <Input 
                              placeholder="Add a comment (e.g. Bank Holiday, Vacation)" 
                              value={item.comment || ""} 
                              onChange={(e) => updateExclusionComment(item.date, e.target.value)}
                              className="bg-background/50 h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Tasks Section */}
            <Collapsible open={isTasksOpen} onOpenChange={setIsTasksOpen} className="w-full">
              <Card className="shadow-sm border-border/60 flex flex-col">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-4 border-b border-border/40 bg-muted/20 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center relative">
                      <CardTitle className="flex items-center justify-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-primary" /> 
                        Tasks
                      </CardTitle>
                      <div className="absolute right-0">
                        {isTasksOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <ScrollArea className="flex-1 p-4 h-[400px]">
                      {tasks.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/50 text-center px-4">
                          <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                          <p className="text-sm">No tasks yet. Add one below!</p>
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {tasks.sort((a, b) => {
                            if (!a.dueDate && !b.dueDate) return 0;
                            if (!a.dueDate) return 1;
                            if (!b.dueDate) return -1;
                            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                          }).map(task => (
                            <li key={task.id} className="group flex items-start gap-3 bg-card p-3 rounded-lg border border-transparent hover:border-border/50 transition-all">
                              <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="mt-1" />
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm leading-tight break-words transition-all", task.completed && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                                  {task.text}
                                </p>
                                {task.dueDate && (
                                  <p className="text-[10px] mt-1 font-medium text-primary flex items-center gap-1">
                                    <CalendarIcon className="h-2.5 w-2.5" />
                                    Due: {format(new Date(task.dueDate), "MMM d")} ({differenceInCalendarDays(new Date(task.dueDate), today)} days left)
                                  </p>
                                )}
                              </div>
                              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
                    <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm space-y-3">
                      <div className="flex gap-2">
                        <Input placeholder="Add a new task..." value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1" />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className={cn(!newTaskDate && "text-muted-foreground")}>
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="single" selected={newTaskDate} onSelect={setNewTaskDate} disabled={(date) => date < today} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <Button type="submit" size="icon" disabled={!newTaskText.trim()} onClick={addTask}><Plus className="h-4 w-4" /></Button>
                      </div>
                      {newTaskDate && (
                        <p className="text-[10px] font-medium text-primary flex items-center gap-1 animate-in slide-in-from-top-1">
                          <CalendarIcon className="h-2.5 w-2.5" />
                          Due date set for {format(newTaskDate, "MMM d")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
