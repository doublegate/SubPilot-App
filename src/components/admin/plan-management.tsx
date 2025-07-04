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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  stripePriceId: string | null;
  features: string[];
  maxBankAccounts: number;
  maxTeamMembers: number;
  isActive: boolean;
}

export function PlanManagement() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Mock plans for now
  const plans: Plan[] = [
    {
      id: '1',
      name: 'free',
      displayName: 'Free',
      price: 0,
      stripePriceId: null,
      features: [
        '2 bank accounts',
        'Basic subscription tracking',
        'Manual cancellation',
        'Email notifications',
      ],
      maxBankAccounts: 2,
      maxTeamMembers: 1,
      isActive: true,
    },
    {
      id: '2',
      name: 'pro',
      displayName: 'Professional',
      price: 9.99,
      stripePriceId: 'price_1234567890',
      features: [
        'Unlimited bank accounts',
        'Advanced subscription tracking',
        'Automated cancellation',
        'AI Assistant',
        'Predictive insights',
        'Export data',
      ],
      maxBankAccounts: -1,
      maxTeamMembers: 1,
      isActive: true,
    },
    {
      id: '3',
      name: 'team',
      displayName: 'Team',
      price: 24.99,
      stripePriceId: 'price_0987654321',
      features: [
        'Everything in Pro',
        'Multi-account support',
        'Up to 5 team members',
        'Shared subscriptions view',
        'Team analytics',
        'Admin controls',
      ],
      maxBankAccounts: -1,
      maxTeamMembers: 5,
      isActive: true,
    },
  ];

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setIsEditOpen(true);
  };

  const handleSavePlan = () => {
    // TODO: Save plan via API
    toast.success('Plan updated successfully');
    setIsEditOpen(false);
    setEditingPlan(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Plans</CardTitle>
              <CardDescription>
                Manage subscription tiers and features
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{plan.displayName}</h3>
                    {plan.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${plan.price}/month
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {plan.features.slice(0, 3).map((feature, i) => (
                      <li key={i}>• {feature}</li>
                    ))}
                    {plan.features.length > 3 && (
                      <li>• +{plan.features.length - 3} more features</li>
                    )}
                  </ul>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPlan(plan)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {editingPlan?.displayName} Plan</DialogTitle>
            <DialogDescription>
              Update plan pricing and features
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={editingPlan.displayName}
                    onChange={e =>
                      setEditingPlan({
                        ...editingPlan,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Monthly Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={editingPlan.price}
                    onChange={e =>
                      setEditingPlan({
                        ...editingPlan,
                        price: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripePriceId">Stripe Price ID</Label>
                <Input
                  id="stripePriceId"
                  value={editingPlan.stripePriceId ?? ''}
                  placeholder="price_..."
                  onChange={e =>
                    setEditingPlan({
                      ...editingPlan,
                      stripePriceId: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxBankAccounts">Max Bank Accounts</Label>
                  <Input
                    id="maxBankAccounts"
                    type="number"
                    value={editingPlan.maxBankAccounts}
                    onChange={e =>
                      setEditingPlan({
                        ...editingPlan,
                        maxBankAccounts: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use -1 for unlimited
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTeamMembers">Max Team Members</Label>
                  <Input
                    id="maxTeamMembers"
                    type="number"
                    value={editingPlan.maxTeamMembers}
                    onChange={e =>
                      setEditingPlan({
                        ...editingPlan,
                        maxTeamMembers: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={editingPlan.isActive}
                  onCheckedChange={checked =>
                    setEditingPlan({ ...editingPlan, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Plan is active</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
