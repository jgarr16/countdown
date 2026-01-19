import { format } from "date-fns";
import { Calendar as CalendarIcon, Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
    targetDate: Date | undefined;
    onTargetDateSelect: (date: Date | undefined) => void;
    syncStatus: {
        state: "idle" | "loading" | "saving" | "saved" | "error";
        message?: string;
        at?: string;
    };
    onReset: () => void;
    today: Date;
}

export function AppHeader({ targetDate, onTargetDateSelect, syncStatus, onReset, today }: AppHeaderProps) {
    return (
        <header className="relative flex items-center justify-center pb-6 border-b border-white/10">
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent drop-shadow-sm">
                Countdown!
            </h1>

            <div className="absolute right-0 top-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
                        <div className="p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Target Date Settings</p>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn(
                                        "w-full justify-start text-left font-medium border-white/10 bg-white/5 hover:bg-white/10 transition-all",
                                        !targetDate && "text-muted-foreground"
                                    )}>
                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                        {targetDate ? format(targetDate, "PPP") : <span>Set your goal date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-card border-white/10" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={targetDate}
                                        onSelect={onTargetDateSelect}
                                        disabled={(date) => date < today}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <DropdownMenuSeparator className="bg-white/5" />

                        <div className="p-3 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cloud Sync Status</p>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="relative">
                                    <span
                                        className={cn(
                                            "h-2.5 w-2.5 rounded-full block transition-all duration-500",
                                            syncStatus.state === "error" && "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                                            syncStatus.state === "saving" && "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]",
                                            syncStatus.state === "loading" && "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]",
                                            syncStatus.state === "saved" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                                            syncStatus.state === "idle" && "bg-muted-foreground/30"
                                        )}
                                    />
                                </div>
                                <span className="font-medium text-foreground/80 lowercase">
                                    {syncStatus.state === "loading" && "Fetching latest..."}
                                    {syncStatus.state === "saving" && "Syncing changes..."}
                                    {syncStatus.state === "saved" && "Cloud updated"}
                                    {syncStatus.state === "error" && "Sync failed"}
                                    {syncStatus.state === "idle" && "Waiting for changes"}
                                </span>
                            </div>
                            {syncStatus.message && (
                                <p className="text-[11px] text-muted-foreground italic leading-tight">{syncStatus.message}</p>
                            )}
                            {syncStatus.at && (
                                <p className="text-[10px] text-muted-foreground/60 font-mono">
                                    Last sync: {format(new Date(syncStatus.at), "HH:mm:ss")}
                                </p>
                            )}
                        </div>

                        {targetDate && (
                            <>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={onReset} className="text-destructive focus:bg-destructive/10 focus:text-destructive m-1 cursor-pointer transition-colors">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    <span className="font-semibold">Reset Everything</span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
