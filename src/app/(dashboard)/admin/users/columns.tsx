'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Mail, Shield, Ban, Unlock, Eye } from 'lucide-react';
import Link from 'next/link';

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  emailVerified: Date | null;
  lockedUntil: Date | null;
  subscriptionPlan: string;
  bankAccounts: number;
  subscriptions: number;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'user',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ''} />
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ||
                user.email?.[0]?.toUpperCase() ||
                '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const user = row.original;
      const isLocked =
        user.lockedUntil && new Date(user.lockedUntil) > new Date();
      const isVerified = user.emailVerified !== null;

      if (isLocked) {
        return <Badge variant="destructive">Locked</Badge>;
      }
      if (!isVerified) {
        return <Badge variant="secondary">Unverified</Badge>;
      }
      return <Badge variant="default">Active</Badge>;
    },
  },
  {
    accessorKey: 'subscriptionPlan',
    header: 'Plan',
    cell: ({ row }) => {
      const plan = row.getValue('subscriptionPlan');
      const variant =
        plan === 'pro' || plan === 'team' ? 'default' : 'secondary';
      return <Badge variant={variant}>{plan}</Badge>;
    },
  },
  {
    accessorKey: 'usage',
    header: 'Usage',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="text-sm">
          <p>{user.bankAccounts} banks</p>
          <p className="text-muted-foreground">
            {user.subscriptions} subscriptions
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return (
        <div className="text-sm">
          <p>{date.toLocaleDateString()}</p>
          <p className="text-muted-foreground">{date.toLocaleTimeString()}</p>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      const isLocked =
        user.lockedUntil && new Date(user.lockedUntil) > new Date();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link href={`/admin/users/${user.id}`}>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Shield className="mr-2 h-4 w-4" />
              Make Admin
            </DropdownMenuItem>
            {isLocked ? (
              <DropdownMenuItem className="text-green-600">
                <Unlock className="mr-2 h-4 w-4" />
                Unlock Account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="text-red-600">
                <Ban className="mr-2 h-4 w-4" />
                Lock Account
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
