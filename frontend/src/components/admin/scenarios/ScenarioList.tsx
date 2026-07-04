import { Scenario } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioListProps {
  scenarios: Scenario[];
  isLoading: boolean;
  onEdit: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
}

export function ScenarioList({
  scenarios,
  isLoading,
  onEdit,
  onDelete,
}: ScenarioListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        シナリオがありません。新規作成してください。
      </div>
    );
  }

  return (
    <div className="border border-border-primary rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
              名前
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
              説明
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
              状態
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
              更新日
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary">
          {scenarios.map((scenario) => (
            <tr key={scenario.id} className="hover:bg-bg-secondary/50">
              <td className="px-4 py-3">
                <span className="font-medium text-text-primary">
                  {scenario.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-text-secondary line-clamp-1">
                  {scenario.description || '-'}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={scenario.is_active ? 'default' : 'secondary'}
                  className={cn(
                    scenario.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {scenario.is_active ? '有効' : '無効'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {new Date(scenario.updated_at).toLocaleDateString('ja-JP')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(scenario)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(scenario)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
