"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Package, 
  Lightbulb,
  TrendingUp,
  Shield,
  Eye,
  Code
} from 'lucide-react';

interface CodeIssue {
  type: 'performance' | 'security' | 'accessibility' | 'best-practice';
  severity: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  fixable: boolean;
}

interface DependencyRecommendation {
  action: 'add' | 'remove' | 'upgrade' | 'replace';
  package: string;
  version?: string;
  reason: string;
  alternative?: string;
}

interface CodeAnalysis {
  issues: CodeIssue[];
  dependencies: DependencyRecommendation[];
  suggestions: string[];
  score: number;
}

interface Props {
  analysis: CodeAnalysis;
  onApplyFix?: (issue: CodeIssue) => void;
  onInstallDependency?: (dep: DependencyRecommendation) => void;
}

export function CodeAnalysisPanel({ analysis, onApplyFix, onInstallDependency }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'accessibility': return <Eye className="h-4 w-4" />;
      case 'best-practice': return <Code className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const issuesByType = analysis.issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Code Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quality Score:</span>
            <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues" className="relative">
              Issues
              {analysis.issues.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 text-xs">
                  {analysis.issues.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="relative">
              Dependencies
              {analysis.dependencies.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 text-xs">
                  {analysis.dependencies.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{issuesByType.performance || 0}</div>
                  <div className="text-sm text-muted-foreground">Performance</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold">{issuesByType.security || 0}</div>
                  <div className="text-sm text-muted-foreground">Security</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{issuesByType.accessibility || 0}</div>
                  <div className="text-sm text-muted-foreground">Accessibility</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{analysis.dependencies.length}</div>
                  <div className="text-sm text-muted-foreground">Dependencies</div>
                </CardContent>
              </Card>
            </div>

            {analysis.score >= 90 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Excellent code quality! Your generated code follows best practices.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {analysis.issues.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No issues found. Great job!</AlertDescription>
              </Alert>
            ) : (
              analysis.issues.map((issue, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(issue.severity) as any}>
                              {issue.severity}
                            </Badge>
                            <span className="font-medium">{issue.message}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {issue.file}
                            {issue.line && ` (line ${issue.line})`}
                          </p>
                          <p className="text-sm">{issue.suggestion}</p>
                        </div>
                      </div>
                      {issue.fixable && onApplyFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApplyFix(issue)}
                        >
                          Auto-fix
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-4">
            {analysis.dependencies.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>All dependencies look good!</AlertDescription>
              </Alert>
            ) : (
              analysis.dependencies.map((dep, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Package className="h-4 w-4 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{dep.action}</Badge>
                            <span className="font-medium">{dep.package}</span>
                            {dep.version && (
                              <span className="text-sm text-muted-foreground">
                                v{dep.version}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {dep.reason}
                          </p>
                          {dep.alternative && (
                            <p className="text-sm">
                              Consider using <code className="bg-muted px-1 rounded">
                                {dep.alternative}
                              </code> instead
                            </p>
                          )}
                        </div>
                      </div>
                      {onInstallDependency && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onInstallDependency(dep)}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {analysis.suggestions.length === 0 ? (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>No additional suggestions at this time.</AlertDescription>
              </Alert>
            ) : (
              analysis.suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-4 w-4 mt-1 text-yellow-500" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
