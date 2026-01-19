import { format, differenceInCalendarDays } from "date-fns";
import { Plus, CheckCircle2, Calendar as CalendarIcon, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Task = {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: Date;
};

interface TaskListProps {
    tasks: Task[];
    onAddTask: (text: string, dueDate?: Date) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    today: Date;
}

export function TaskList({ tasks, onAddTask, onToggleTask, onDeleteTask, today }: TaskListProps) {
    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        onAddTask(newTaskText, newTaskDate);
        setNewTaskText("");
        setNewTaskDate(undefined);
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
        <div className="flex flex-col h-full min-h-0">
            <div
                className="flex items-center justify-between mb-4 px-1 cursor-pointer group/title"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight group-hover/title:text-primary transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Milestones
                    </h2>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {tasks.filter(t => !t.completed).length} Pending
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover/title:text-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {isExpanded && (
                <>
                    <ScrollArea className="flex-1 pr-4 -mr-4 mb-4 max-h-[400px]">
                        {tasks.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/30 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-xs font-medium">No tasks on the horizon</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {sortedTasks.map(task => (
                                    <li key={task.id} className="group flex items-start gap-3 bg-card/40 backdrop-blur-sm p-3 rounded-xl border border-white/5 hover:border-primary/20 transition-all duration-300">
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={() => onToggleTask(task.id)}
                                            className="mt-1 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm leading-snug break-words transition-all duration-300 font-medium",
                                                task.completed && "text-muted-foreground/50 line-through"
                                            )}>
                                                {task.text}
                                            </p>
                                            {task.dueDate && (
                                                <p className={cn(
                                                    "text-[10px] mt-1.5 font-bold flex items-center gap-1.5 uppercase tracking-wider",
                                                    task.completed ? "text-muted-foreground/30" : "text-primary/70"
                                                )}>
                                                    <CalendarIcon className="h-2.5 w-2.5" />
                                                    {format(new Date(task.dueDate), "MMM d")} • {differenceInCalendarDays(new Date(task.dueDate), today)}d remaining
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-all p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ScrollArea>

                    <form onSubmit={handleSubmit} className="mt-auto pt-4 border-t border-white/5 space-y-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Next objective..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                className="flex-1 bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl text-sm"
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                            "border-white/10 bg-white/5 hover:bg-white/10 rounded-xl transition-all",
                                            newTaskDate && "text-primary border-primary/30"
                                        )}
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-card border-white/10" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={newTaskDate}
                                        onSelect={setNewTaskDate}
                                        disabled={(date) => date < today}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!newTaskText.trim()}
                                className="rounded-xl shadow-lg shadow-primary/20"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {newTaskDate && (
                            <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 px-1 animate-in slide-in-from-top-1 pb-1 uppercase tracking-widest">
                                <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                Deadline: {format(newTaskDate, "MMMM d")}
                            </p>
                        )}
                    </form>
                </>
            )}
        </div>
    );
}
