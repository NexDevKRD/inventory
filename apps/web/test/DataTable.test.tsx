import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from '../src/components/ui/DataTable';

describe('DataTable', () => {
  const columns = [{ key: 'name', header: 'Name' }];
  const rows = [{ name: 'Alice' }, { name: 'Bob' }];

  it('renders rows', () => {
    const { unmount } = render(<DataTable columns={columns} rows={rows} page={1} pageSize={10} total={2} onPageChange={() => {}} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    unmount();
  });

  it('shows empty state when rows is empty', () => {
    const { unmount } = render(<DataTable columns={columns} rows={[]} page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/no results/i)).toBeDefined();
    unmount();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    const { unmount } = render(<DataTable columns={columns} rows={rows} page={1} pageSize={1} total={2} onPageChange={onPageChange} />);
    const nextButtons = screen.getAllByRole('button', { name: /next/i });
    fireEvent.click(nextButtons[0]);
    expect(onPageChange).toHaveBeenCalledWith(2);
    unmount();
  });
});
