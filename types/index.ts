import { Database } from './database.types';

export type Room = Database['public']['Tables']['rooms']['Row'];
export type RouteStep = Database['public']['Tables']['route_steps']['Row'];
