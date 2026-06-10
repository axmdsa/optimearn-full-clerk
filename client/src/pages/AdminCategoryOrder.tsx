import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ClipboardList, Video, Smartphone, Gift, Users, Layers,
  Flame, GripVertical, Save, RotateCcw
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

type CategoryId = 'survey' | 'video' | 'app_trial' | 'offer' | 'daily' | 'social' | 'play_to_earn';

const allCategories: { id: CategoryId; label: string; icon: React.ReactNode }[] = [
  { id: 'daily',     label: 'Daily',        icon: <Gift className="w-4 h-4" /> },
  { id: 'survey',    label: 'Surveys',      icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'video',     label: 'Videos',       icon: <Video className="w-4 h-4" /> },
  { id: 'app_trial', label: 'App Trials',   icon: <Smartphone className="w-4 h-4" /> },
  { id: 'offer',     label: 'Offers',       icon: <Layers className="w-4 h-4" /> },
  { id: 'social',    label: 'Social',       icon: <Users className="w-4 h-4" /> },
  { id: 'play_to_earn', label: 'Play to Earn', icon: <Flame className="w-4 h-4" /> },
];

export default function AdminCategoryOrder() {
  const { user } = useAuth();
  const [order, setOrder] = useState<CategoryId[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CategoryId | null>(null);

  // Fetch current order
  const { data: currentOrder, isLoading } = trpc.admin.categorySectionOrder.get.useQuery();

  // Update mutation
  const updateOrder = trpc.admin.categorySectionOrder.update.useMutation({
    onSuccess: () => {
      toast.success('Category order updated successfully');
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Initialize order from server or use default
  useEffect(() => {
    if (currentOrder) {
      setOrder(currentOrder as CategoryId[]);
    } else if (!isLoading) {
      // Default order if not set
      setOrder(allCategories.map(c => c.id));
    }
  }, [currentOrder, isLoading]);

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="pt-6">
              <p className="text-red-400">Access denied. Admin privileges required.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleDragStart = (id: CategoryId) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: CategoryId) => {
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = order.indexOf(draggedItem);
    const targetIndex = order.indexOf(targetId);

    const newOrder = [...order];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setOrder(newOrder);
    setIsDirty(true);
    setDraggedItem(null);
  };

  const handleMoveUp = (id: CategoryId) => {
    const index = order.indexOf(id);
    if (index <= 0) return;

    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    setOrder(newOrder);
    setIsDirty(true);
  };

  const handleMoveDown = (id: CategoryId) => {
    const index = order.indexOf(id);
    if (index >= order.length - 1) return;

    const newOrder = [...order];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];

    setOrder(newOrder);
    setIsDirty(true);
  };

  const handleReset = () => {
    setOrder(allCategories.map(c => c.id));
    setIsDirty(true);
  };

  const handleSave = async () => {
    await updateOrder.mutateAsync({ order });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Category Section Order</h1>
          <p className="text-muted-foreground">Drag and drop or use buttons to reorder how offer categories appear on the Missions page</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Offer Categories</CardTitle>
            <CardDescription>Reorder the sections displayed to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              {order.map((categoryId, index) => {
                const category = allCategories.find(c => c.id === categoryId);
                if (!category) return null;

                return (
                  <div
                    key={categoryId}
                    draggable
                    onDragStart={() => handleDragStart(categoryId)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(categoryId)}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-move ${
                      draggedItem === categoryId
                        ? 'border-primary bg-primary/10 opacity-50'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                    <div className="flex items-center gap-2 flex-1">
                      {category.icon}
                      <span className="font-medium">{category.label}</span>
                    </div>

                    <Badge variant="outline" className="flex-shrink-0">
                      #{index + 1}
                    </Badge>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveUp(categoryId)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveDown(categoryId)}
                        disabled={index === order.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!isDirty || updateOrder.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateOrder.isPending ? 'Saving...' : 'Save Order'}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                disabled={!isDirty}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-blue-500/10 border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-blue-400">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">This is the order categories will appear on the Missions page:</p>
            <div className="flex flex-wrap gap-2">
              {order.map((categoryId) => {
                const category = allCategories.find(c => c.id === categoryId);
                return (
                  <Badge key={categoryId} variant="secondary" className="gap-1">
                    {category?.icon}
                    {category?.label}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
