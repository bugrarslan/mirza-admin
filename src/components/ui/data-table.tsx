'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
}

function DataTableComponent<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  searchPlaceholder = 'Ara...',
  onSearch,
  actions,
  emptyMessage = 'Kayıt bulunamadı.',
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1);
    onSearch?.(query);
  }, [onSearch]);

  const totalPages = useMemo(() => Math.ceil(data.length / pageSize), [data.length, pageSize]);
  
  const paginatedData = useMemo(() => data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  ), [data, currentPage, pageSize]);

  const getCellValue = useCallback((item: T, accessor: Column<T>['accessor']): React.ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    const value = item[accessor];
    if (value === null || value === undefined) return '-';
    return String(value);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">İşlemler</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={keyExtractor(item)}>
                  {columns.map((column, index) => (
                    <TableCell key={index} className={column.className}>
                      {getCellValue(item, column.accessor)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">{actions(item)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {data.length} kayıttan {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, data.length)} arası gösteriliyor
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Sayfa {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Memo ile sarıyoruz - generic type için type assertion gerekli
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
