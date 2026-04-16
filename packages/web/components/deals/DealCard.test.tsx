import { render, screen } from '@testing-library/react';
import { DealCard } from './DealCard';
import { Deal, DealStage } from '@closepilot/core/src/types/deal';

const mockDeal: Deal = {
  id: '1',
  stage: DealStage.INGESTION,
  leadName: 'John Doe',
  leadCompany: 'Acme Corp',
  leadEmail: 'john@acme.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  source: 'manual',
};

describe('DealCard', () => {
  it('renders deal information', () => {
    render(<DealCard deal={mockDeal} onClick={() => {}} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
