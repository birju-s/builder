"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface Credential {
  id: string;
  provider: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [deployMode, setDeployMode] = useState<'cpanel' | 'whmcs'>('cpanel');
  const [newToken, setNewToken] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'cpanel'>('github');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCredentials();
    fetchDeployMode();
  }, []);

  async function fetchCredentials() {
    try {
      const res = await fetch('/api/settings/credentials');
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      toast.error('Failed to fetch credentials');
      console.error(error);
    }
  }

  async function fetchDeployMode() {
    try {
      const res = await fetch('/api/settings/deploy-mode');
      const data = await res.json();
      if (data.mode) {
        setDeployMode(data.mode.toLowerCase());
      }
    } catch (error) {
      console.error('Failed to fetch deployment mode:', error);
    }
  }

  async function addCredential() {
    if (!newToken.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, token: newToken }),
      });
      
      if (!res.ok) throw new Error('Failed to add credential');
      
      setNewToken('');
      toast.success(`${selectedProvider} credential added successfully`);
      fetchCredentials();
    } catch (error) {
      toast.error('Failed to add credential');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function removeCredential(credId: string) {
    try {
      const res = await fetch(`/api/settings/credentials/${credId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove credential');
      
      toast.success('Credential removed');
      fetchCredentials();
    } catch (error) {
      toast.error('Failed to remove credential');
      console.error(error);
    }
  }

  async function updateDeployMode(mode: 'cpanel' | 'whmcs') {
    try {
      const res = await fetch('/api/settings/deploy-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      
      if (!res.ok) throw new Error('Failed to update deployment mode');
      
      setDeployMode(mode);
      toast.success(`Deployment mode updated to ${mode}`);
    } catch (error) {
      toast.error('Failed to update deployment mode');
      console.error(error);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Credential</Label>
            <div className="flex gap-2 mt-2">
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'github' | 'cpanel')}
                className="border rounded px-3 py-2"
              >
                <option value="github">GitHub</option>
                <option value="cpanel">cPanel</option>
              </select>
              <Input
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Token/API Key"
                type="password"
              />
              <Button onClick={addCredential} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Connected Services</Label>
            <div className="space-y-2 mt-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex justify-between items-center p-2 border rounded">
                  <span className="capitalize">{cred.provider}</span>
                  <Button variant="destructive" size="sm" onClick={() => removeCredential(cred.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              {credentials.length === 0 && (
                <p className="text-muted-foreground text-sm">No credentials added yet</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Deployment Mode</Label>
            <RadioGroup 
              value={deployMode} 
              onValueChange={(value) => updateDeployMode(value as 'cpanel' | 'whmcs')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cpanel" id="cpanel" />
                <Label htmlFor="cpanel">Direct cPanel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whmcs" id="whmcs" />
                <Label htmlFor="whmcs">WHMCS (billing integration)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
