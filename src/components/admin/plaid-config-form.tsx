'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export function PlaidConfigForm() {
  const [config, setConfig] = useState({
    clientId: '',
    secret: '',
    environment: 'sandbox',
    products: ['transactions', 'accounts', 'identity'],
    countryCodes: ['US', 'CA'],
  });

  const handleSave = async () => {
    // TODO: Save via API
    toast.success('Plaid configuration updated');
  };

  const handleTestConnection = async () => {
    // TODO: Test connection
    toast.success('Connection successful!');
  };

  const products = [
    { id: 'transactions', label: 'Transactions' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'identity', label: 'Identity' },
    { id: 'investments', label: 'Investments' },
    { id: 'liabilities', label: 'Liabilities' },
    { id: 'payment_initiation', label: 'Payment Initiation' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plaid API Configuration</CardTitle>
        <CardDescription>
          Configure your Plaid integration settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={config.clientId}
            onChange={(e) =>
              setConfig({ ...config, clientId: e.target.value })
            }
            placeholder="Your Plaid Client ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret">Secret Key</Label>
          <Input
            id="secret"
            type="password"
            value={config.secret}
            onChange={(e) =>
              setConfig({ ...config, secret: e.target.value })
            }
            placeholder="Your Plaid Secret"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select
            value={config.environment}
            onValueChange={(value) =>
              setConfig({ ...config, environment: value })
            }
          >
            <SelectTrigger id="environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Products</Label>
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id} className="flex items-center space-x-2">
                <Checkbox
                  id={product.id}
                  checked={config.products.includes(product.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setConfig({
                        ...config,
                        products: [...config.products, product.id],
                      });
                    } else {
                      setConfig({
                        ...config,
                        products: config.products.filter(
                          (p) => p !== product.id
                        ),
                      });
                    }
                  }}
                />
                <Label
                  htmlFor={product.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {product.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
          <Button variant="outline" onClick={handleTestConnection}>
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}