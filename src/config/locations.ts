import type { LocationDefinition } from '../domain/models/types';

export const LOCATIONS: LocationDefinition[] = [
  {
    locationId: 'velvet-heights',
    displayName: 'Velvet Heights',
    mapNode: 1,
    mapPosition: { x: 50, y: 16 },
  },
  {
    locationId: 'vista-creek-towers',
    displayName: 'Vista Creek Towers',
    mapNode: 2,
    mapPosition: { x: 79, y: 49 },
  },
  {
    locationId: 'ez-mart',
    displayName: 'EZ Mart',
    mapNode: 3,
    mapPosition: { x: 50, y: 83 },
  },
  {
    locationId: 'ashview-gardens',
    displayName: 'Ashview Gardens',
    mapNode: 4,
    mapPosition: { x: 21, y: 49 },
  },
];

export const LOCATION_BY_ID = Object.fromEntries(
  LOCATIONS.map((location) => [location.locationId, location]),
) as Record<LocationDefinition['locationId'], LocationDefinition>;
