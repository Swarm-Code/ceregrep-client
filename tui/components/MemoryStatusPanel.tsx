/**
 * Memory Status Panel
 * Shows real-time memory usage and alerts
 * Can be toggled with Ctrl+M during TUI operation
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { getMemoryProfiler } from '../utils/memoryProfiler.js';
import { getTheme } from '../../utils/theme.js';

interface MemoryStatus {
  heapMB: number;
  peakHeapMB: number;
  rssMB: number;
  peakRSSMB: number;
  heapGrowthPercent: number;
  rssGrowthPercent: number;
  alertCount: number;
  lastAlert?: string;
}

export const MemoryStatusPanel: React.FC<{ width: number }> = ({ width }) => {
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [profilerEnabled, setProfilerEnabled] = useState(false);
  const theme = getTheme();

  useEffect(() => {
    try {
      const profiler = getMemoryProfiler();
      if (!profiler) {
        setProfilerEnabled(false);
        return;
      }

      setProfilerEnabled(true);
      const updateStatus = () => {
        const metrics = profiler.getMetrics();
        const current = process.memoryUsage();
        const alerts = profiler.getAlerts(1);

        setStatus({
          heapMB: current.heapUsed / 1024 / 1024,
          peakHeapMB: metrics.peakHeapUsed / 1024 / 1024,
          rssMB: current.rss / 1024 / 1024,
          peakRSSMB: metrics.peakRSS / 1024 / 1024,
          heapGrowthPercent: metrics.currentHeapGrowth,
          rssGrowthPercent: metrics.currentRSSGrowth,
          alertCount: alerts.length > 0 ? 1 : 0,
          lastAlert: alerts[0]?.message,
        });
      };

      updateStatus();
      const interval = setInterval(updateStatus, 1000);
      return () => clearInterval(interval);
    } catch (err) {
      setProfilerEnabled(false);
    }
  }, []);

  if (!profilerEnabled) {
    return (
      <Box flexDirection="column" borderColor="#6b7280" borderStyle="round" paddingX={1} paddingY={1}>
        <Text bold color={theme.secondaryText}>Memory Profiling Disabled</Text>
        <Text color={theme.secondaryText}>Enable with: MEMORY_PROFILE=1 scout tui</Text>
      </Box>
    );
  }

  if (!status) {
    return <Text color={theme.secondaryText}>Loading memory stats...</Text>;
  }

  // Determine color based on growth
  const heapColor = status.heapGrowthPercent > 50 ? '#EF4444' : status.heapGrowthPercent > 20 ? '#F59E0B' : '#10B981';
  const rssColor = status.rssGrowthPercent > 50 ? '#EF4444' : status.rssGrowthPercent > 20 ? '#F59E0B' : '#10B981';

  return (
    <Box flexDirection="column" borderColor="#6b7280" borderStyle="round" paddingX={1} paddingY={1}>
      <Box>
        <Text bold>Memory Status</Text>
      </Box>

      {/* Heap usage */}
      <Box marginTop={1}>
        <Box width={15}>
          <Text>Heap:</Text>
        </Box>
        <Text color={heapColor}>
          {status.heapMB.toFixed(0)}MB / {status.peakHeapMB.toFixed(0)}MB peak
        </Text>
        <Box paddingLeft={1}>
          <Text color={theme.secondaryText}>
            ({status.heapGrowthPercent > 0 ? '+' : ''}{status.heapGrowthPercent.toFixed(1)}%)
          </Text>
        </Box>
      </Box>

      {/* RSS usage */}
      <Box>
        <Box width={15}>
          <Text>RSS:</Text>
        </Box>
        <Text color={rssColor}>
          {status.rssMB.toFixed(0)}MB / {status.peakRSSMB.toFixed(0)}MB peak
        </Text>
        <Box paddingLeft={1}>
          <Text color={theme.secondaryText}>
            ({status.rssGrowthPercent > 0 ? '+' : ''}{status.rssGrowthPercent.toFixed(1)}%)
          </Text>
        </Box>
      </Box>

      {/* Alerts */}
      {status.alertCount > 0 && status.lastAlert && (
        <Box marginTop={1}>
          <Text color="#EF4444">⚠ {status.lastAlert}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.secondaryText}>
          Ctrl+M to close • Press Ctrl+G for full report
        </Text>
      </Box>
    </Box>
  );
};
