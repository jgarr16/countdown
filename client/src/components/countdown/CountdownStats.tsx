import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CountdownStatsProps {
    calendarDays: number | string;
    workingDays: number | string;
    hasTargetDate: boolean;
}

export function CountdownStats({ calendarDays, workingDays, hasTargetDate }: CountdownStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="bg-card/40 backdrop-blur-md border border-white/5 shadow-xl transition-all hover:scale-[1.02] hover:bg-card/50">
                <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Days</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                    <div className="text-6xl font-black tracking-tighter text-foreground drop-shadow-sm">
                        {hasTargetDate ? calendarDays : "—"}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 shadow-2xl transition-all hover:scale-[1.02] overflow-hidden relative group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="pb-2 text-center relative z-10">
                    <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <Briefcase className="h-3 w-3" /> Working Days
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6 relative z-10">
                    <div className="text-6xl font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                        {hasTargetDate ? workingDays : "—"}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
