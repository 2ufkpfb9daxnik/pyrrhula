"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Column = {
  id: string;
  name: string;
  visible: boolean;
};

type ColumnControllerProps = {
  columns: Column[];
  onChange: (columns: Column[]) => void;
};

export function ColumnController({ columns, onChange }: ColumnControllerProps) {
  const handleToggle = (columnId: string) => {
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onChange(updatedColumns);
  };

  const handleToggleAll = (value: boolean) => {
    const updatedColumns = columns.map((col) => ({ ...col, visible: value }));
    onChange(updatedColumns);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">カラム表示設定</h3>
        <div className="flex items-center space-x-2">
          <Label htmlFor="all-columns" className="text-xs">
            すべて表示
          </Label>
          <Switch
            id="all-columns"
            checked={columns.every((col) => col.visible)}
            onCheckedChange={handleToggleAll}
          />
        </div>
      </div>
      <div className="space-y-2">
        {columns.map((column) => (
          <div key={column.id} className="flex items-center justify-between">
            <Label htmlFor={column.id} className="text-sm">
              {column.name}
            </Label>
            <Switch
              id={column.id}
              checked={column.visible}
              onCheckedChange={() => handleToggle(column.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
