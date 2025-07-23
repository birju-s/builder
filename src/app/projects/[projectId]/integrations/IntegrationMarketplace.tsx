"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  ExternalLink, 
  Star, 
  Shield, 
  CreditCard,
  Database,
  Mail,
  BarChart3,
  Cloud
} from 'lucide-react';

import { IntegrationProvider } from '@/lib/integrations/types';
import { 
  getAllIntegrations, 
  getIntegrationsByType, 
  searchIntegrations,
  getFeaturedIntegrations
} from '@/lib/integrations/registry';

interface Props {
  projectId: string;
  onInstallIntegration: (integration: IntegrationProvider) => void;
  installedIntegrations: string[];
}

export function IntegrationMarketplace({ 
  projectId, 
  onInstallIntegration,
  installedIntegrations 
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const getIntegrations = () => {
    if (searchQuery) {
      return searchIntegrations(searchQuery);
    }
    
    if (activeCategory === 'all') {
      return getAllIntegrations();
    }
    
    if (activeCategory === 'featured') {
      return getFeaturedIntegrations();
    }
    
    return getIntegrationsByType(activeCategory);
  };

  const integrations = getIntegrations();

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'storage': return <Cloud className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  const categories = [
    { id: 'all', label: 'All', count: getAllIntegrations().length },
    { id: 'featured', label: 'Featured', count: getFeaturedIntegrations().length },
    { id: 'auth', label: 'Authentication', count: getIntegrationsByType('auth').length },
    { id: 'payment', label: 'Payments', count: getIntegrationsByType('payment').length },
    { id: 'database', label: 'Database', count: getIntegrationsByType('database').length },
    { id: 'email', label: 'Email', count: getIntegrationsByType('email').length },
    { id: 'analytics', label: 'Analytics', count: getIntegrationsByType('analytics').length },
    { id: 'storage', label: 'Storage', count: getIntegrationsByType('storage').length },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Integration Marketplace</h1>
            <p className="text-muted-foreground">
              Add third-party services to your project
            </p>
          </div>
          <Badge variant="outline">
            {installedIntegrations.length} installed
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 border-r p-4">
          <div className="space-y-1">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveCategory(category.id)}
              >
                {getCategoryIcon(category.id)}
                <span className="ml-2">{category.label}</span>
                <Badge variant="outline" className="ml-auto">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="flex-1 p-6 overflow-auto">
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">
                No integrations found
              </div>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  installed={installedIntegrations.includes(integration.id)}
                  onInstall={() => onInstallIntegration(integration)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface IntegrationCardProps {
  integration: IntegrationProvider;
  installed: boolean;
  onInstall: () => void;
}

function IntegrationCard({ integration, installed, onInstall }: IntegrationCardProps) {
  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'storage': return <Cloud className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              {integration.icon ? (
                <img 
                  src={integration.icon} 
                  alt={integration.name}
                  className="w-6 h-6"
                />
              ) : (
                getCategoryIcon(integration.type)
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getCategoryIcon(integration.type)}
                  <span className="ml-1 capitalize">{integration.type}</span>
                </Badge>
                {integration.pricing?.freeTier && (
                  <Badge variant="secondary" className="text-xs">
                    Free tier
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {installed && (
            <Badge variant="default" className="absolute top-2 right-2">
              Installed
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {integration.description}
        </p>

        {/* Features Preview */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Components ({integration.templates.components.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {integration.templates.components.slice(0, 3).map((component) => (
              <Badge key={component.name} variant="outline" className="text-xs">
                {component.name}
              </Badge>
            ))}
            {integration.templates.components.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{integration.templates.components.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        {integration.pricing && (
          <div className="text-xs text-muted-foreground">
            {integration.pricing.freeTier ? 'Free tier available' : integration.pricing.paidPlans}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={onInstall}
            disabled={installed}
            className="flex-1"
          >
            {installed ? 'Installed' : 'Install'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(integration.website, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
