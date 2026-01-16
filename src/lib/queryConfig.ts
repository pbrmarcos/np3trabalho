/**
 * Centralized query configuration for React Query
 * Standardizes cache behavior across the application
 */

export const QUERY_STALE_TIME = {
  /** 10 minutes - For static data that rarely changes (categories, packages, SEO configs) */
  STATIC: 1000 * 60 * 10,
  
  /** 5 minutes - For stable data (plans, system settings, brand logos) */
  STABLE: 1000 * 60 * 5,
  
  /** 30 seconds - For dynamic data (lists, dashboards, timelines) */
  DYNAMIC: 1000 * 30,
  
  /** Always fresh - For form data and real-time needs */
  REALTIME: 0,
} as const;

export const QUERY_LIMITS = {
  /** Maximum items for dashboard summaries */
  DASHBOARD_SUMMARY: 5,
  
  /** Maximum items for dashboard lists */
  DASHBOARD_LIST: 100,
  
  /** Default page size for paginated lists */
  PAGE_SIZE: 20,
  
  /** Maximum items for timeline events */
  TIMELINE_EVENTS: 100,
  
  /** Maximum items per category in timeline */
  TIMELINE_PER_CATEGORY: 50,
} as const;

export type QueryStaleTime = typeof QUERY_STALE_TIME[keyof typeof QUERY_STALE_TIME];
export type QueryLimit = typeof QUERY_LIMITS[keyof typeof QUERY_LIMITS];
