import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KanbanBoard } from './KanbanBoard';

jest.mock('../../lib/api', () => ({
  fetchDeals: jest.fn().mockResolvedValue([
    {
      id: '1',
      stage: 'ingestion',
      leadName: 'John Doe',
      leadCompany: 'Acme Corp',
      leadEmail: 'john@acme.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual',
    },
  ]),
  updateDealStage: jest.fn(),
}));

describe('KanbanBoard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders columns and fetches deals', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <KanbanBoard deals={[]} onDealUpdate={() => {}} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Ingestion')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Completed')[0]).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
  });
});
