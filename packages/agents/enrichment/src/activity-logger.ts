export interface ActivityLogEntry {
  timestamp: Date;
  dealId: string;
  action: string;
  details: any;
}

export class ActivityLogger {
  private logs: ActivityLogEntry[] = [];

  /**
   * Logs an activity related to a specific deal.
   */
  log(dealId: string, action: string, details?: any): void {
    const entry: ActivityLogEntry = {
      timestamp: new Date(),
      dealId,
      action,
      details: details || {}
    };

    this.logs.push(entry);

    // In a real application, this might persist to a database
    console.log(`[ActivityLogger] [${entry.timestamp.toISOString()}] Deal ${dealId} - ${action}`, details ? JSON.stringify(details) : '');
  }

  /**
   * Retrieves all logs for a given deal.
   */
  getLogsForDeal(dealId: string): ActivityLogEntry[] {
    return this.logs.filter(log => log.dealId === dealId);
  }

  /**
   * Retrieves all logs.
   */
  getAllLogs(): ActivityLogEntry[] {
    return [...this.logs];
  }
}
