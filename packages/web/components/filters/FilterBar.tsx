'use client';

import { SearchBar } from './SearchBar';

export interface Filters {
  search: string;
  assignee: string;
  stage: string;
}

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  assignees?: string[];
  stages?: { value: string; label: string }[];
}

export function FilterBar({ filters, onFilterChange, assignees = [], stages = [] }: FilterBarProps) {
  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filters, search });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, assignee: (e.target as any).value });
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, stage: (e.target as any).value });
  };

  return (
    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
      <div className="flex-1">
        <SearchBar onSearch={handleSearchChange} initialValue={filters.search} />
      </div>

      <div className="flex space-x-4">
        <select
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={filters.assignee}
          onChange={handleAssigneeChange}
        >
          <option value="">All Assignees</option>
          {assignees.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>

        <select
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={filters.stage}
          onChange={handleStageChange}
        >
          <option value="">All Stages</option>
          {stages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}