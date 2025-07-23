"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Code,
  Book
} from 'lucide-react';

import { IntegrationProvider, IntegrationConfigField } from '@/lib/integrations/types';
import { validateIntegrationConfig } from '@/lib/integrations/registry';

interface Props {
  integration: IntegrationProvider;
  projectId: string;
  onComplete: (config: Record<string, any>) => void;
  onCancel: () => void;
}

export function IntegrationSetupWizard({ integration, projectId, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);

  const steps = [
    'Overview',
    'Configuration', 
    'Environment Variables',
    'Review & Install'
  ];

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      const validation = validateIntegrationConfig(integration, config);
      setValidationErrors(validation.errors);
      return validation.valid;
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleInstall = async () => {
    if (!validateCurrentStep()) return;

    setIsInstalling(true);
    try {
      await onComplete(config);
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              {integration.icon ? (
                <img src={integration.icon} alt={integration.name} className="w-5 h-5" />
              ) : (
                <Code className="h-4 w-4" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">Setup {integration.name}</h1>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {steps.map((stepName, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index <= step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {index < step ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className="mx-3 text-sm font-medium">
                {stepName}
              </span>
              {index < steps.length - 1 && (
                <div className={`h-px w-12 ${index < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-3">About {integration.name}</h2>
                <p className="text-muted-foreground mb-4">{integration.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Features</h3>
                    <div className="space-y-2">
                      {integration.templates.components.slice(0, 5).map(component => (
                        <div key={component.name} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="text-sm">{component.name}</span>
                        </div>
                      ))}
                      {integration.templates.components.length > 5 && (
                        <div className="text-sm text-muted-foreground">
                          +{integration.templates.components.length - 5} more components
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Pricing</h3>
                    <div className="space-y-1">
                      {integration.pricing?.freeTier && (
                        <Badge variant="secondary">Free tier available</Badge>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {integration.pricing?.paidPlans}
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => window.open(integration.website, '_blank')}
                      >
                        View pricing details <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This integration will add {integration.dependencies.npm.length} packages and 
                  {integration.envVars.length} environment variables to your project.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-3">Configuration</h2>
                <p className="text-muted-foreground mb-6">
                  Configure {integration.name} settings for your project.
                </p>
              </div>

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div>Please fix the following errors:</div>
                    <ul className="list-disc list-inside mt-2">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4">
                {integration.configSchema.map(field => (
                  <ConfigField
                    key={field.key}
                    field={field}
                    value={config[field.key] || ''}
                    onChange={(value) => updateConfig(field.key, value)}
                    showSensitive={showSensitive[field.key]}
                    onToggleSensitive={() => toggleSensitiveVisibility(field.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-3">Environment Variables</h2>
                <p className="text-muted-foreground mb-6">
                  Add these environment variables to your project's .env file.
                </p>
              </div>

              <div className="space-y-4">
                {integration.envVars.map(envVar => (
                  <div key={envVar.key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {envVar.key}
                        </code>
                        {envVar.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        {envVar.sensitive && (
                          <Badge variant="outline" className="text-xs">Sensitive</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(`${envVar.key}=your_value_here`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{envVar.description}</p>
                    
                    {/* Show configured value for this env var */}
                    {integration.configSchema.find(c => c.key.toLowerCase().includes(envVar.key.toLowerCase().replace('NEXT_PUBLIC_', '').replace('_KEY', '').replace('_SECRET', ''))) && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        Value: {config[integration.configSchema.find(c => c.key.toLowerCase().includes(envVar.key.toLowerCase().replace('NEXT_PUBLIC_', '').replace('_KEY', '').replace('_SECRET', '')))?.key || ''] || 'Not configured'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Never commit sensitive environment variables to your repository. 
                  Use your hosting platform's environment variable settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-3">Review & Install</h2>
                <p className="text-muted-foreground mb-6">
                  Review your configuration and install {integration.name}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Configuration</h3>
                  <div className="space-y-2">
                    {integration.configSchema.map(field => (
                      <div key={field.key} className="flex justify-between">
                        <span className="text-sm">{field.label}:</span>
                        <span className="text-sm font-mono">
                          {field.type === 'password' && config[field.key]
                            ? '••••••••'
                            : config[field.key] || 'Not set'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">What will be installed</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>{integration.dependencies.npm.length}</strong> NPM packages
                    </div>
                    <div className="text-sm">
                      <strong>{integration.templates.components.length}</strong> components
                    </div>
                    <div className="text-sm">
                      <strong>{integration.templates.hooks.length}</strong> custom hooks
                    </div>
                    <div className="text-sm">
                      <strong>{integration.envVars.length}</strong> environment variables
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This integration will be added to your project and you can start using 
                  its components in your AI conversations and visual editor.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {step < steps.length - 1 ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleInstall} disabled={isInstalling}>
                {isInstalling ? 'Installing...' : 'Install Integration'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ConfigFieldProps {
  field: IntegrationConfigField;
  value: any;
  onChange: (value: any) => void;
  showSensitive?: boolean;
  onToggleSensitive?: () => void;
}

function ConfigField({ field, value, onChange, showSensitive, onToggleSensitive }: ConfigFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'password':
        return (
          <div className="relative">
            <Input
              type={showSensitive ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {onToggleSensitive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={onToggleSensitive}
              >
                {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
        );
      
      case 'json':
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="font-mono text-sm"
          />
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
