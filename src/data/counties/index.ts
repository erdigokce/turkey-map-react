// County data exports for individual cities
// Import only the county data you need to keep bundle size small
// Example: import { istanbulCounties } from 'turkey-map-react/lib/data/counties';

export { istanbulCounties } from './istanbul';
export { ankaraCounties } from './ankara';
export { izmirCounties } from './izmir';

// Re-export CountyData type for convenience
export type { CountyData, CountyType } from '../../CountyMapPopup';
