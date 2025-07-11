"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Search,
  BarChart,
  Settings,
  Brain,
  Loader2,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { type SerializableAgent } from "@/server/actions/agents";

interface AgentExecutorProps {
  agent: SerializableAgent & {
    config?: any;
    health?: any;
  };
  tenantId: string;
  userRole: 'admin' | 'user';
  onTaskComplete?: (result: any) => void;
}

interface TaskResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  executedAt: Date;
}

interface TaskHistory {
  id: string;
  operation: string;
  status: 'success' | 'error' | 'running';
  duration: number;
  timestamp: Date;
  result?: any;
  error?: string;
}

export function AgentExecutor({ agent, tenantId, userRole, onTaskComplete }: AgentExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [taskInput, setTaskInput] = useState('');
  const [taskOptions, setTaskOptions] = useState<Record<string, any>>({});
  const [lastResult, setLastResult] = useState<TaskResult | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  
  const availableOperations = getOperationsForAgent(agent.id);

  const executeTask = async () => {
    if (!selectedOperation || (!taskInput && requiresInput(selectedOperation))) {
      toast.error("Please provide all required inputs");
      return;
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`/api/agents/${agent.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          operation: selectedOperation,
          data: prepareTaskData(selectedOperation, taskInput, taskOptions),
          options: taskOptions
        }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      const taskResult: TaskResult = {
        success: result.success,
        result: result.result,
        error: result.error,
        duration,
        executedAt: new Date()
      };

      setLastResult(taskResult);

      // Add to history
      const historyItem: TaskHistory = {
        id: Date.now().toString(),
        operation: selectedOperation,
        status: result.success ? 'success' : 'error',
        duration,
        timestamp: new Date(),
        result: result.result,
        error: result.error
      };

      setTaskHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10 items

      if (result.success) {
        toast.success(`${agent.name} task completed successfully`, {
          description: `Operation: ${selectedOperation} (${duration}ms)`
        });
        onTaskComplete?.(result);
      } else {
        toast.error("Task execution failed", {
          description: result.error
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        executedAt: new Date()
      };

      setLastResult(taskResult);
      toast.error("Failed to execute task", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResult = () => {
    if (lastResult?.result) {
      navigator.clipboard.writeText(JSON.stringify(lastResult.result, null, 2));
      toast.success("Result copied to clipboard");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Execution Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Execute Agent Task
          </CardTitle>
          <CardDescription>
            Configure and run tasks for {agent.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operation Selection */}
          <div className="space-y-2">
            <Label htmlFor="operation">Operation</Label>
            <Select value={selectedOperation} onValueChange={setSelectedOperation}>
              <SelectTrigger>
                <SelectValue placeholder="Select an operation" />
              </SelectTrigger>
              <SelectContent>
                {availableOperations.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    <div className="flex items-center gap-2">
                      {op.icon}
                      <div>
                        <div>{op.label}</div>
                        <div className="text-xs text-muted-foreground">{op.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Field */}
          {selectedOperation && requiresInput(selectedOperation) && (
            <div className="space-y-2">
              <Label htmlFor="input">
                {getInputLabel(selectedOperation)}
              </Label>
              {getInputType(selectedOperation) === 'textarea' ? (
                <Textarea
                  id="input"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder={getInputPlaceholder(selectedOperation)}
                  rows={4}
                />
              ) : (
                <Input
                  id="input"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder={getInputPlaceholder(selectedOperation)}
                />
              )}
            </div>
          )}

          {/* Additional Options */}
          {selectedOperation && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="grid grid-cols-2 gap-4">
                {getOptionsForOperation(selectedOperation).map((option) => (
                  <div key={option.key} className="space-y-1">
                    <Label className="text-sm">{option.label}</Label>
                    {option.type === 'select' ? (
                      <Select
                        value={taskOptions[option.key] || option.default}
                        onValueChange={(value) => setTaskOptions(prev => ({ ...prev, [option.key]: value }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {option.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={option.type}
                        value={taskOptions[option.key] || option.default || ''}
                        onChange={(e) => setTaskOptions(prev => ({ ...prev, [option.key]: e.target.value }))}
                        placeholder={option.placeholder}
                        className="h-8"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execute Button */}
          <Button 
            onClick={executeTask} 
            disabled={isExecuting || !selectedOperation}
            className="w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Task
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs defaultValue="result" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="result">Current Result</TabsTrigger>
          <TabsTrigger value="history">Task History</TabsTrigger>
        </TabsList>

        <TabsContent value="result" className="space-y-4">
          {lastResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {lastResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span>
                      {lastResult.success ? 'Task Completed' : 'Task Failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {lastResult.duration}ms
                    </Badge>
                    {lastResult.success && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyResult}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastResult.success ? (
                  <div className="space-y-4">
                    <ResultDisplay result={lastResult.result} operation={selectedOperation} />
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 dark:text-red-100">
                          Execution Error
                        </h4>
                        <p className="text-red-700 dark:text-red-200 mt-1">
                          {lastResult.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks executed yet</p>
                  <p className="text-sm">Configure and run a task above to see results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {taskHistory.length > 0 ? (
            <div className="space-y-2">
              {taskHistory.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div>
                        <div className="font-medium">{task.operation}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {task.duration}ms
                      </Badge>
                      {task.status === 'success' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLastResult({
                            success: true,
                            result: task.result,
                            duration: task.duration,
                            executedAt: task.timestamp
                          })}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No task history</p>
                  <p className="text-sm">Previous executions will appear here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getOperationsForAgent(agentId: string) {
  const operations = {
    'knowledge-base': [
      {
        value: 'search',
        label: 'Search Knowledge Base',
        description: 'Search documents and web content',
        icon: <Search className="h-4 w-4" />
      },
      {
        value: 'analyze',
        label: 'Analyze Document',
        description: 'AI-powered document analysis',
        icon: <FileText className="h-4 w-4" />
      },
      {
        value: 'generate',
        label: 'Generate Insights',
        description: 'Generate insights from content',
        icon: <Brain className="h-4 w-4" />
      }
    ],
    'business-rules': [
      {
        value: 'validate',
        label: 'Validate Data',
        description: 'Validate against business rules',
        icon: <CheckCircle className="h-4 w-4" />
      },
      {
        value: 'audit',
        label: 'Audit Compliance',
        description: 'Perform compliance audit',
        icon: <Settings className="h-4 w-4" />
      },
      {
        value: 'monitor',
        label: 'Monitor Violations',
        description: 'Monitor rule violations',
        icon: <AlertTriangle className="h-4 w-4" />
      }
    ],
    'testing': [
      {
        value: 'runTests',
        label: 'Run Test Suite',
        description: 'Execute automated tests',
        icon: <Play className="h-4 w-4" />
      },
      {
        value: 'validateQuality',
        label: 'Quality Validation',
        description: 'Validate code quality',
        icon: <CheckCircle className="h-4 w-4" />
      },
      {
        value: 'performanceTest',
        label: 'Performance Test',
        description: 'Run performance tests',
        icon: <BarChart className="h-4 w-4" />
      }
    ],
    'workflow': [
      {
        value: 'execute',
        label: 'Execute Workflow',
        description: 'Run workflow process',
        icon: <Play className="h-4 w-4" />
      },
      {
        value: 'schedule',
        label: 'Schedule Workflow',
        description: 'Schedule workflow execution',
        icon: <Clock className="h-4 w-4" />
      },
      {
        value: 'monitor',
        label: 'Monitor Workflows',
        description: 'Monitor workflow status',
        icon: <BarChart className="h-4 w-4" />
      }
    ],
    'analytics': [
      {
        value: 'generateReport',
        label: 'Generate Report',
        description: 'Create analytics report',
        icon: <FileText className="h-4 w-4" />
      },
      {
        value: 'analyzeData',
        label: 'Analyze Data',
        description: 'Perform data analysis',
        icon: <BarChart className="h-4 w-4" />
      },
      {
        value: 'getDashboard',
        label: 'Get Dashboard',
        description: 'Retrieve dashboard data',
        icon: <BarChart className="h-4 w-4" />
      }
    ]
  };

  return operations[agentId as keyof typeof operations] || [];
}

function requiresInput(operation: string): boolean {
  const noInputOperations = ['audit', 'monitor', 'getDashboard'];
  return !noInputOperations.includes(operation);
}

function getInputLabel(operation: string): string {
  const labels = {
    search: 'Search Query',
    analyze: 'Document ID',
    generate: 'Topic or Query',
    validate: 'Data to Validate',
    runTests: 'Test Configuration',
    validateQuality: 'Target for Validation',
    performanceTest: 'Performance Target',
    execute: 'Workflow Configuration',
    schedule: 'Schedule Configuration',
    generateReport: 'Report Parameters',
    analyzeData: 'Data Query'
  };
  return labels[operation as keyof typeof labels] || 'Input';
}

function getInputPlaceholder(operation: string): string {
  const placeholders = {
    search: 'Enter your search query...',
    analyze: 'Enter document ID to analyze...',
    generate: 'Enter topic for insight generation...',
    validate: 'Enter data in JSON format...',
    runTests: 'Enter test suite configuration...',
    validateQuality: 'Enter target for quality validation...',
    performanceTest: 'Enter performance test target...',
    execute: 'Enter workflow configuration...',
    schedule: 'Enter schedule configuration...',
    generateReport: 'Enter report parameters...',
    analyzeData: 'Enter data analysis query...'
  };
  return placeholders[operation as keyof typeof placeholders] || 'Enter input...';
}

function getInputType(operation: string): 'input' | 'textarea' {
  const textareaOperations = ['validate', 'runTests', 'execute', 'schedule', 'generateReport'];
  return textareaOperations.includes(operation) ? 'textarea' : 'input';
}

function getOptionsForOperation(operation: string) {
  const commonOptions = [
    {
      key: 'maxResults',
      label: 'Max Results',
      type: 'number',
      default: '10',
      placeholder: '10'
    }
  ];

  const operationOptions = {
    search: [
      ...commonOptions,
      {
        key: 'includeWebContent',
        label: 'Include Web Content',
        type: 'select',
        default: 'true',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      }
    ],
    analyze: [
      {
        key: 'includeInsights',
        label: 'Include AI Insights',
        type: 'select',
        default: 'true',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]
      }
    ],
    generate: [
      {
        key: 'depth',
        label: 'Analysis Depth',
        type: 'select',
        default: 'standard',
        options: [
          { value: 'basic', label: 'Basic' },
          { value: 'standard', label: 'Standard' },
          { value: 'detailed', label: 'Detailed' }
        ]
      }
    ]
  };

  return operationOptions[operation as keyof typeof operationOptions] || commonOptions;
}

function prepareTaskData(operation: string, input: string, options: Record<string, any>) {
  const baseData = { [getInputField(operation)]: input };
  
  // Convert string options to appropriate types
  const processedOptions = Object.entries(options).reduce((acc, [key, value]) => {
    if (key === 'maxResults') {
      acc[key] = parseInt(value) || 10;
    } else if (value === 'true' || value === 'false') {
      acc[key] = value === 'true';
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  return { ...baseData, ...processedOptions };
}

function getInputField(operation: string): string {
  const fields = {
    search: 'query',
    analyze: 'documentId',
    generate: 'query',
    validate: 'data',
    runTests: 'testSuite',
    validateQuality: 'target',
    performanceTest: 'target',
    execute: 'workflow',
    schedule: 'workflow',
    generateReport: 'dataset',
    analyzeData: 'query'
  };
  return fields[operation as keyof typeof fields] || 'input';
}

function ResultDisplay({ result, operation }: { result: any; operation: string }) {
  if (!result) return null;

  // Format results based on operation type
  if (operation === 'search' && result.results) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Search Results</h4>
          <Badge>{result.results.totalResults} results</Badge>
        </div>
        
        <div className="space-y-2">
          {result.results.documents?.slice(0, 5).map((doc: any, index: number) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="font-medium">{doc.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {doc.content?.substring(0, 150)}...
              </div>
            </div>
          ))}
          
          {result.results.webAnalyses?.slice(0, 3).map((web: any, index: number) => (
            <div key={`web-${index}`} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="font-medium">{web.title}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {web.content?.substring(0, 150)}...
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Generic JSON display for other results
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Result Data</h4>
        <Badge variant="outline">JSON</Badge>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
} 