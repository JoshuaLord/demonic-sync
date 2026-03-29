import { Database } from './database.types';

export type Room = Database['public']['Tables']['rooms']['Row'];
export type RouteStep = Database['public']['Tables']['route_steps']['Row'];
export type OfficialRelic = Database['public']['Tables']['official_relics']['Row'];
export type OfficialRegion = Database['public']['Tables']['official_regions']['Row'];

export type MilestoneSelections = Record<string, number>;
// Format: { "relic_t1": 3, "area_u1": 2 }
