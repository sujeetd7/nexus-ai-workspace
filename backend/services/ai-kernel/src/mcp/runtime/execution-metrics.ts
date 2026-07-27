export interface ExecutionMetric {
  serverId: string;
  toolName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  totalLatency: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  timeoutCount: number;
  retryCount: number;
  lastExecution: Date;
  firstExecution: Date;
}

export interface MetricSnapshot {
  timestamp: Date;
  serverId: string;
  toolName: string;
  duration: number;
  success: boolean;
  retryAttempt: number;
  timedOut: boolean;
}

export class ExecutionMetricsCollector {
  private metrics = new Map<string, ExecutionMetric>(); // key: serverId:toolName
  private snapshots: MetricSnapshot[] = [];
  private maxSnapshots: number;

  constructor(maxSnapshots: number = 10000) {
    this.maxSnapshots = maxSnapshots;
  }

  recordExecution(
    serverId: string,
    toolName: string,
    duration: number,
    success: boolean,
    retryAttempt: number = 0,
    timedOut: boolean = false,
  ): void {
    const key = `${serverId}:${toolName}`;
    const now = new Date();

    // Update metric
    let metric = this.metrics.get(key);
    if (!metric) {
      metric = {
        serverId,
        toolName,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        averageLatency: 0,
        minLatency: Number.MAX_SAFE_INTEGER,
        maxLatency: 0,
        timeoutCount: 0,
        retryCount: 0,
        lastExecution: now,
        firstExecution: now,
      };
    }

    // Update counts
    metric.executionCount++;
    if (success) {
      metric.successCount++;
    } else {
      metric.failureCount++;
    }

    if (timedOut) {
      metric.timeoutCount++;
    }

    if (retryAttempt > 0) {
      metric.retryCount++;
    }

    // Update latency stats
    metric.totalLatency += duration;
    metric.averageLatency = metric.totalLatency / metric.executionCount;
    metric.minLatency = Math.min(metric.minLatency, duration);
    metric.maxLatency = Math.max(metric.maxLatency, duration);
    metric.lastExecution = now;

    this.metrics.set(key, metric);

    // Record snapshot
    const snapshot: MetricSnapshot = {
      timestamp: now,
      serverId,
      toolName,
      duration,
      success,
      retryAttempt,
      timedOut,
    };

    this.snapshots.push(snapshot);

    // Prune old snapshots if needed
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  getMetric(serverId: string, toolName: string): ExecutionMetric | null {
    const key = `${serverId}:${toolName}`;
    return this.metrics.get(key) || null;
  }

  getServerMetrics(serverId: string): ExecutionMetric[] {
    return Array.from(this.metrics.values()).filter(
      (metric) => metric.serverId === serverId,
    );
  }

  getAllMetrics(): ExecutionMetric[] {
    return Array.from(this.metrics.values());
  }

  getAggregatedServerMetrics(serverId: string): {
    serverId: string;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    averageLatency: number;
    totalTimeouts: number;
    totalRetries: number;
    toolCount: number;
  } {
    const serverMetrics = this.getServerMetrics(serverId);

    if (serverMetrics.length === 0) {
      return {
        serverId,
        totalExecutions: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        averageLatency: 0,
        totalTimeouts: 0,
        totalRetries: 0,
        toolCount: 0,
      };
    }

    const totals = serverMetrics.reduce(
      (acc, metric) => ({
        executions: acc.executions + metric.executionCount,
        successes: acc.successes + metric.successCount,
        failures: acc.failures + metric.failureCount,
        latency: acc.latency + metric.totalLatency,
        timeouts: acc.timeouts + metric.timeoutCount,
        retries: acc.retries + metric.retryCount,
      }),
      {
        executions: 0,
        successes: 0,
        failures: 0,
        latency: 0,
        timeouts: 0,
        retries: 0,
      },
    );

    return {
      serverId,
      totalExecutions: totals.executions,
      totalSuccesses: totals.successes,
      totalFailures: totals.failures,
      averageLatency:
        totals.executions > 0 ? totals.latency / totals.executions : 0,
      totalTimeouts: totals.timeouts,
      totalRetries: totals.retries,
      toolCount: serverMetrics.length,
    };
  }

  getGlobalMetrics(): {
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    averageLatency: number;
    totalTimeouts: number;
    totalRetries: number;
    serverCount: number;
    toolCount: number;
    successRate: number;
  } {
    const allMetrics = this.getAllMetrics();

    if (allMetrics.length === 0) {
      return {
        totalExecutions: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        averageLatency: 0,
        totalTimeouts: 0,
        totalRetries: 0,
        serverCount: 0,
        toolCount: 0,
        successRate: 0,
      };
    }

    const totals = allMetrics.reduce(
      (acc, metric) => ({
        executions: acc.executions + metric.executionCount,
        successes: acc.successes + metric.successCount,
        failures: acc.failures + metric.failureCount,
        latency: acc.latency + metric.totalLatency,
        timeouts: acc.timeouts + metric.timeoutCount,
        retries: acc.retries + metric.retryCount,
        servers: acc.servers.add(metric.serverId),
      }),
      {
        executions: 0,
        successes: 0,
        failures: 0,
        latency: 0,
        timeouts: 0,
        retries: 0,
        servers: new Set<string>(),
      },
    );

    return {
      totalExecutions: totals.executions,
      totalSuccesses: totals.successes,
      totalFailures: totals.failures,
      averageLatency:
        totals.executions > 0 ? totals.latency / totals.executions : 0,
      totalTimeouts: totals.timeouts,
      totalRetries: totals.retries,
      serverCount: totals.servers.size,
      toolCount: allMetrics.length,
      successRate:
        totals.executions > 0
          ? (totals.successes / totals.executions) * 100
          : 0,
    };
  }

  getRecentSnapshots(limit: number = 100): MetricSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  getSnapshotsForServer(
    serverId: string,
    limit: number = 100,
  ): MetricSnapshot[] {
    return this.snapshots
      .filter((snapshot) => snapshot.serverId === serverId)
      .slice(-limit);
  }

  getSnapshotsForTool(
    serverId: string,
    toolName: string,
    limit: number = 100,
  ): MetricSnapshot[] {
    return this.snapshots
      .filter(
        (snapshot) =>
          snapshot.serverId === serverId && snapshot.toolName === toolName,
      )
      .slice(-limit);
  }

  reset(): void {
    this.metrics.clear();
    this.snapshots = [];
  }

  resetServer(serverId: string): void {
    const keysToDelete = Array.from(this.metrics.keys()).filter((key) =>
      key.startsWith(`${serverId}:`),
    );

    keysToDelete.forEach((key) => this.metrics.delete(key));

    this.snapshots = this.snapshots.filter(
      (snapshot) => snapshot.serverId !== serverId,
    );
  }

  resetTool(serverId: string, toolName: string): void {
    const key = `${serverId}:${toolName}`;
    this.metrics.delete(key);

    this.snapshots = this.snapshots.filter(
      (snapshot) =>
        !(snapshot.serverId === serverId && snapshot.toolName === toolName),
    );
  }

  export(): {
    metrics: ExecutionMetric[];
    snapshots: MetricSnapshot[];
    exportedAt: Date;
  } {
    return {
      metrics: this.getAllMetrics(),
      snapshots: [...this.snapshots],
      exportedAt: new Date(),
    };
  }
}
