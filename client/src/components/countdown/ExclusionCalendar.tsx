import { format, isSaturday, isSunday } from "date-fns";
import { ChevronDown, ChevronUp, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ExcludedDate = {
    date: string; // ISO string
    comment?: string;
};

interface ExclusionCalendarProps {
    excludedDates: ExcludedDate[];
    onToggleExclusion: (date: Date) => void;
    onUpdateComment: (isoDate: string, comment: string) => void;
    today: Date;
    targetDate: Date | undefined;
    taskDates: Date[];
}

export function ExclusionCalendar({
    excludedDates,
    onToggleExclusion,
    onUpdateComment,
    today,
    targetDate,
    taskDates
}: ExclusionCalendarProps) {
    const [isOpen, setIsOpen] = useState(false);

    const excludedDatesObj = excludedDates.map(d => new Date(d.date));

    return (
        <div className="space-y-6">
            <Card className="shadow-2xl border border-white/5 bg-card/40 backdrop-blur-xl overflow-hidden group">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Select Off-Days</CardTitle>
                </CardHeader>
                <CardContent className="pb-8 pt-2">
                    <div className="flex justify-center w-full">
                        <div className="w-full max-w-sm border border-white/10 rounded-2xl p-3 bg-white/5 shadow-inner">
                            <div className="[&_.rdp]:!m-0 [&_.rdp-months]:!justify-center [&_.rdp-month]:!w-full [&_.rdp-table]:!w-full [&_.rdp-cell]:!p-0 [&_.rdp-button]:!h-10 [&_.rdp-button]:!w-full [&_.rdp-head_cell]:!font-bold [&_.rdp-day]:!h-10 [&_.rdp-day]:!w-full [&_.rdp-tbody]:!h-auto [&_.rdp-table]:!table-fixed [&_.rdp-table]:!border-collapse [&_.rdp-month]:!space-y-0">
                                <Calendar
                                    mode="multiple"
                                    selected={excludedDatesObj}
                                    onSelect={(_, date) => onToggleExclusion(date)}
                                    className="w-full h-auto"
                                    disabled={(date) => date < today}
                                    modifiers={{
                                        weekend: (date) => isSaturday(date) || isSunday(date),
                                        tasked: taskDates,
                                        expired: (date) => date < today,
                                        targetDay: targetDate ? [targetDate] : []
                                    }}
                                    modifiersClassNames={{
                                        expired: "calendar-day-expired opacity-20",
                                        targetDay: "calendar-day-target bg-primary/20 text-primary font-bold ring-2 ring-primary/50"
                                    }}
                                    modifiersStyles={{
                                        weekend: { color: "rgba(255,255,255,0.2)", opacity: 0.5 },
                                        tasked: {
                                            borderBottom: "3px solid var(--primary)",
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

            {excludedDates.length > 0 && (
                <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
                    <Card className="shadow-xl border border-white/5 bg-card/30 backdrop-blur-md">
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-white/5 transition-all p-4 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                            <CalendarIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        <CardTitle className="text-sm font-bold tracking-tight">Excluded Dates List</CardTitle>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 font-mono text-muted-foreground">
                                            {excludedDates.length}
                                        </span>
                                    </div>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pb-6 pt-0 px-4">
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    {[...excludedDates].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item) => (
                                        <div key={item.date} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-foreground/80">{format(new Date(item.date), "MMM d, yyyy")}</span>
                                                <button
                                                    onClick={() => onToggleExclusion(new Date(item.date))}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <Input
                                                placeholder="Reason for skipping (e.g. Vacation, Holiday)"
                                                value={item.comment || ""}
                                                onChange={(e) => onUpdateComment(item.date, e.target.value)}
                                                className="bg-black/20 border-white/5 h-8 text-[11px] placeholder:text-muted-foreground/30 focus:border-primary/30 transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            )}
        </div>
    );
}
