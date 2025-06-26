'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit3, Save, X, Plus, Tag, FileText } from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface SubscriptionNotesProps {
  subscriptionId: string;
  notes: string | null;
  tags: string[];
  onUpdate?: () => void;
}

export function SubscriptionNotes({
  subscriptionId,
  notes,
  tags = [],
  onUpdate,
}: SubscriptionNotesProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes ?? '');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');

  const updateMutation = api.subscriptions.update.useMutation({
    onSuccess: () => {
      toast.success('Notes updated successfully');
      setIsEditingNotes(false);
      onUpdate?.();
    },
    onError: error => {
      toast.error('Failed to update notes', {
        description: error.message,
      });
    },
  });

  const handleSaveNotes = () => {
    updateMutation.mutate({
      id: subscriptionId,
      notes: editedNotes.trim() || undefined,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      // For now, we'll store tags in the notes field as hashtags
      // In a real implementation, you'd want a separate tags field
      const updatedNotes = `${editedNotes}\n#${newTag.trim()}`.trim();
      setEditedNotes(updatedNotes);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedNotes(notes ?? '');
    setIsEditingNotes(false);
  };

  const extractTags = (text: string): string[] => {
    const tagRegex = /#(\w+)/g;
    const matches = text.match(tagRegex) ?? [];
    return matches.map(tag => tag.substring(1));
  };

  const getNotesWithoutTags = (text: string): string => {
    return text.replace(/#\w+/g, '').trim();
  };

  const displayNotes = notes ? getNotesWithoutTags(notes) : '';
  const displayTags = notes ? extractTags(notes) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Notes & Tags
          {!isEditingNotes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNotes(true)}
              className="ml-auto"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes Section */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Notes</h4>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
                placeholder="Add notes about this subscription..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-2 h-3 w-3" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {displayNotes || (
                <span className="italic">No notes added yet</span>
              )}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium">Tags</h4>
            {!isAddingTag && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingTag(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Existing Tags */}
            {displayTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayTags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm italic text-muted-foreground">
                No tags added yet
              </div>
            )}

            {/* Add New Tag */}
            {isAddingTag && (
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Enter tag name..."
                  className="flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddTag();
                    } else if (e.key === 'Escape') {
                      setNewTag('');
                      setIsAddingTag(false);
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddTag}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewTag('');
                    setIsAddingTag(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tag Suggestions */}
        {displayTags.length === 0 && !isAddingTag && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">
              Quick Tags
            </h5>
            <div className="flex flex-wrap gap-1">
              {['important', 'review', 'cancel-soon', 'shared', 'business'].map(
                tag => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setNewTag(tag);
                      setIsAddingTag(true);
                    }}
                  >
                    <Tag className="mr-1 h-2 w-2" />
                    {tag}
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
