import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeals, getDealStats } from '../deals';

// Mock the db module
vi.mock('../../db', () => ({
  getDb: vi.fn(),
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
    desc: vi.fn((col) => ({ type: 'desc', col })),
    and: vi.fn((...conditions) => ({ type: 'and', conditions })),
    gte: vi.fn((col, val) => ({ type: 'gte', col, val })),
    lte: vi.fn((col, val) => ({ type: 'lte', col, val })),
    or: vi.fn((...conditions) => ({ type: 'or', conditions })),
    ilike: vi.fn((col, val) => ({ type: 'ilike', col, val })),
  };
});

import { getDb } from '../../db';

function makeQueryBuilder(rows: any[]) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };
  return builder;
}

describe('getDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all deals with default pagination', async () => {
    const mockDeals = [
      { id: 1, stage: 'ingestion', leadEmail: 'a@example.com', leadName: 'A', source: 'manual', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, stage: 'scoping', leadEmail: 'b@example.com', leadName: 'B', source: 'gmail', createdAt: new Date(), updatedAt: new Date() },
    ];
    const mockDb = makeQueryBuilder(mockDeals);
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDeals();

    expect(result).toEqual(mockDeals);
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalled();
    expect(mockDb.limit).toHaveBeenCalledWith(50);
    expect(mockDb.offset).toHaveBeenCalledWith(0);
  });

  it('applies pagination parameters', async () => {
    const mockDb = makeQueryBuilder([]);
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    await getDeals(undefined, { limit: 10, offset: 20 });

    expect(mockDb.limit).toHaveBeenCalledWith(10);
    expect(mockDb.offset).toHaveBeenCalledWith(20);
  });

  it('filters by stage when provided', async () => {
    const mockDeals = [
      { id: 1, stage: 'scoping', leadEmail: 'a@example.com', leadName: 'A', source: 'manual', createdAt: new Date(), updatedAt: new Date() },
    ];
    const mockDb = makeQueryBuilder(mockDeals);
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDeals({ stage: 'scoping' as any });

    expect(result).toEqual(mockDeals);
    expect(mockDb.where).toHaveBeenCalled();
  });

  it('returns empty array when no deals exist', async () => {
    const mockDb = makeQueryBuilder([]);
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDeals();

    expect(result).toEqual([]);
  });
});

describe('getDealStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns counts by stage', async () => {
    const rows = [
      { stage: 'ingestion' },
      { stage: 'ingestion' },
      { stage: 'ingestion' },
      { stage: 'scoping' },
      { stage: 'completed' },
    ];

    // getDealStats uses a different query builder pattern - no limit/offset
    const mockDb: any = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockResolvedValue(rows),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDealStats();

    expect(result).toEqual({
      ingestion: 3,
      scoping: 1,
      completed: 1,
    });
  });

  it('returns empty object when no deals exist', async () => {
    const mockDb: any = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDealStats();

    expect(result).toEqual({});
  });

  it('handles null stage values', async () => {
    const rows = [{ stage: null }, { stage: 'ingestion' }];
    const mockDb: any = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockResolvedValue(rows),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as any);

    const result = await getDealStats();

    expect(result).toEqual({ unknown: 1, ingestion: 1 });
  });
});
