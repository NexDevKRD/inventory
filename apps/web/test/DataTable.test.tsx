import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from '../src/components/ui/DataTable';

describe('DataTable', () => {
  const columns: { key: 'name'; header: string }[] = [{ key: 'name', header: 'Name' }];
  const rows = [{ name: 'Alice' }, { name: 'Bob' }];

  it('renders rows', () => {
    render(<DataTable columns={columns} rows={rows} page={1} pageSize={10} total={2} onPageChange={() => {}} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows empty state when rows is empty', () => {
    render(<DataTable columns={columns} rows={[]} page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTable columns={columns} rows={rows} page={1} pageSize={1} total={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
