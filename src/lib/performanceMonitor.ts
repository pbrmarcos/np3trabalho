// Performance monitoring utility for critical queries
// Only enabled for developer user

import { supabase } from "@/integrations/supabase/client";
import { DEVELOPER_EMAIL, SLOW_QUERY_THRESHOLD_MS } from "@/lib/constants";

type MetricEntry = {
  name: string;
  duration: number;
  timestamp: number;
  status: 'success' | 'error';
};

type SlowQueryAlert = {
  queryName: string;
  duration: number;
  timestamp: number;
  threshold: number;
};

class PerformanceMonitor {
  private metrics: MetricEntry[] = [];
  private enabled: boolean = false;
  private maxEntries: number = 100;
  private slowQueryAlerts: SlowQueryAlert[] = [];
  private alertsEnabled: boolean = true;
  private developerUserId: string | null = null;

  enable() {
    this.enabled = true;
    console.log('[PerfMonitor] Performance monitoring enabled');
  }

  disable() {
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  setDeveloperUserId(userId: string | null) {
    this.developerUserId = userId;
  }

  setAlertsEnabled(enabled: boolean) {
    this.alertsEnabled = enabled;
  }

  getSlowQueryAlerts(): SlowQueryAlert[] {
    return [...this.slowQueryAlerts];
  }

  clearSlowQueryAlerts() {
    this.slowQueryAlerts = [];
  }

  private async sendSlowQueryNotification(alert: SlowQueryAlert) {
    if (!this.alertsEnabled || !this.developerUserId) return;

    try {
      // Create in-app notification for developer
      await supabase.from("notifications").insert({
        user_id: this.developerUserId,
        type: "performance_alert",
        title: "⚠️ Query Lenta Detectada",
        message: `${alert.queryName}: ${Math.round(alert.duration)}ms (limite: ${alert.threshold}ms)`,
        read: false,
      });
      
      console.warn(`[PerfMonitor] SLOW QUERY ALERT: ${alert.queryName} took ${Math.round(alert.duration)}ms`);
    } catch (error) {
      console.error("[PerfMonitor] Failed to send slow query notification:", error);
    }
  }

  startTimer(label: string): (status?: 'success' | 'error') => void {
    if (!this.enabled) return () => {};
    
    const startTime = performance.now();
    console.time(`[Query] ${label}`);
    
    return (status: 'success' | 'error' = 'success') => {
      const duration = performance.now() - startTime;
      console.timeEnd(`[Query] ${label}`);
      
      this.addMetric({
        name: label,
        duration,
        timestamp: Date.now(),
        status,
      });

      // Check for slow query and send alert
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        const alert: SlowQueryAlert = {
          queryName: label,
          duration,
          timestamp: Date.now(),
          threshold: SLOW_QUERY_THRESHOLD_MS,
        };
        this.slowQueryAlerts.unshift(alert);
        if (this.slowQueryAlerts.length > 20) {
          this.slowQueryAlerts = this.slowQueryAlerts.slice(0, 20);
        }
        this.sendSlowQueryNotification(alert);
      }
    };
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    
    const endTimer = this.startTimer(label);
    try {
      const result = await fn();
      endTimer('success');
      return result;
    } catch (error) {
      endTimer('error');
      throw error;
    }
  }

  private addMetric(entry: MetricEntry) {
    this.metrics.unshift(entry);
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(0, this.maxEntries);
    }
  }

  getMetrics(): MetricEntry[] {
    return [...this.metrics];
  }

  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        slowQueries: 0,
        errorRate: 0,
        byQuery: {},
      };
    }

    const totalQueries = this.metrics.length;
    const avgDuration = this.metrics.reduce((acc, m) => acc + m.duration, 0) / totalQueries;
    const slowQueries = this.metrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD_MS).length;
    const errorRate = (this.metrics.filter(m => m.status === 'error').length / totalQueries) * 100;

    // Group by query name
    const byQuery: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
    this.metrics.forEach(m => {
      if (!byQuery[m.name]) {
        byQuery[m.name] = { count: 0, avgDuration: 0, maxDuration: 0 };
      }
      byQuery[m.name].count++;
      byQuery[m.name].avgDuration = 
        (byQuery[m.name].avgDuration * (byQuery[m.name].count - 1) + m.duration) / byQuery[m.name].count;
      byQuery[m.name].maxDuration = Math.max(byQuery[m.name].maxDuration, m.duration);
    });

    return {
      totalQueries,
      avgDuration: Math.round(avgDuration),
      slowQueries,
      errorRate: Math.round(errorRate * 10) / 10,
      byQuery,
    };
  }

  clear() {
    this.metrics = [];
  }
}

export const perfMonitor = new PerformanceMonitor();
// Re-export para compatibilidade
export { SLOW_QUERY_THRESHOLD_MS } from "@/lib/constants";
