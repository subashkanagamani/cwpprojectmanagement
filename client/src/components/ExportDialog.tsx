import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  type ExportOptions,
} from '../utils/enhancedExport';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  data: any[];
  columns: Array<{ key: string; label: string; format?: (value: any) => string }>;
  filename: string;
  onDateRangeFilter?: (startDate: string, endDate: string) => any[];
}

export function ExportDialog({
  open,
  onOpenChange,
  title,
  data,
  columns,
  filename,
  onDateRangeFilter,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getExportData = () => {
    if (startDate && endDate && onDateRangeFilter) {
      return onDateRangeFilter(startDate, endDate);
    }
    return data;
  };

  const exportData = getExportData();
  const itemCount = exportData.length;

  const handleExport = () => {
    const exportOptions: ExportOptions = {
      filename,
      title,
      columns,
      data: exportData,
    };

    switch (format) {
      case 'xlsx':
        exportToExcel(exportOptions);
        break;
      case 'pdf':
        exportToPDF(exportOptions);
        break;
      case 'csv':
      default:
        exportToCSV(exportOptions);
        break;
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose a format and optional date range to export your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="format-select">Export Format</Label>
            <Select value={format} onValueChange={(value: any) => setFormat(value)}>
              <SelectTrigger id="format-select" data-testid="select-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv" data-testid="option-csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="xlsx" data-testid="option-xlsx">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (XLSX)
                  </div>
                </SelectItem>
                <SelectItem value="pdf" data-testid="option-pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {onDateRangeFilter && (
            <div className="space-y-3">
              <Label className="text-foreground">Date Range (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md bg-secondary/50 p-3">
            <span className="text-sm text-foreground">Items to export:</span>
            <Badge variant="secondary" data-testid="badge-item-count">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="gap-2"
            data-testid="button-export"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
