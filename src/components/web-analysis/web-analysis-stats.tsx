import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

interface WebAnalysisStatsProps {
  stats: {
    total: number;
    successful: number;
    failed: number;
    processing: number;
    successRate: number;
  };
}

export function WebAnalysisStats({ stats }: WebAnalysisStatsProps) {
  const statCards = [
    {
      title: "Total Analyses",
      value: stats.total,
      icon: Globe,
      description: "Websites analyzed",
      color: "text-blue-500",
    },
    {
      title: "Successful",
      value: stats.successful,
      icon: CheckCircle,
      description: "Successfully processed",
      color: "text-green-500",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: XCircle,
      description: "Analysis errors",
      color: "text-red-500",
    },
    {
      title: "Processing",
      value: stats.processing,
      icon: Clock,
      description: "Currently analyzing",
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Success Rate Card */}
      {stats.total > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.successful} of {stats.total} analyses completed successfully
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 