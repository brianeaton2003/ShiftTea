import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationsPageClient } from './LocationsPageClient';

const searchState = {
  locationId: '',
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (name: string) => (name === 'locationId' ? searchState.locationId : null),
  }),
}));

vi.mock('@/components/LocationDetailView', () => ({
  LocationDetailView: ({ id }: { id: string }) => <div data-testid="location-detail">location:{id}</div>,
}));

vi.mock('@/components/FindWorkplaceForm', () => ({
  FindWorkplaceForm: ({ title }: { title: string }) => <div data-testid="find-form">{title}</div>,
}));

describe('LocationsPageClient', () => {
  beforeEach(() => {
    searchState.locationId = '';
  });

  it('renders location detail view when locationId is present in search params', () => {
    searchState.locationId = 'abc123';
    render(<LocationsPageClient />);

    expect(screen.getByTestId('location-detail')).toHaveTextContent('location:abc123');
    expect(screen.queryByTestId('find-form')).not.toBeInTheDocument();
  });

  it('renders find workplace form when locationId is absent', () => {
    searchState.locationId = '';
    render(<LocationsPageClient />);

    expect(screen.getByTestId('find-form')).toHaveTextContent('Find a workplace');
    expect(screen.queryByTestId('location-detail')).not.toBeInTheDocument();
  });
});
