/**
 * Overlapping Events Layout Algorithm for Vertical Timeline
 * Automatically places overlapping tasks and timetable events side-by-side
 * into dynamic columns without ever obscuring or covering any item.
 */

export interface TimelineLayoutInput {
  id: string;
  startHour: number; // e.g. 9.5 for 09:30
  endHour: number;   // e.g. 11.0 for 11:00
}

export interface PositionedTimelineItem<T extends TimelineLayoutInput = TimelineLayoutInput> {
  item: T;
  column: number;
  totalColumns: number;
  colSpan: number;
  leftPercent: number;
  widthPercent: number;
}

/**
 * Calculates side-by-side column positioning for timeline items.
 * Non-overlapping items take 100% of the available width.
 * Overlapping items share width evenly into side-by-side columns (2, 3, 4+ columns).
 */
export function computeTimelineLayout<T extends TimelineLayoutInput>(
  rawItems: T[]
): PositionedTimelineItem<T>[] {
  if (!rawItems || rawItems.length === 0) return [];

  // 1. Sanitize start/end times (ensure minimum 30-min duration)
  const items: Array<{ raw: T; start: number; end: number }> = rawItems.map((item) => {
    const start = Math.max(0, Math.min(24, item.startHour));
    const end = Math.max(start + 0.4, Math.min(24, item.endHour));
    return { raw: item, start, end };
  });

  // 2. Sort by start time ascending, then longer duration first
  items.sort((a, b) => {
    if (Math.abs(a.start - b.start) > 0.001) {
      return a.start - b.start;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  // 3. Partition into connected overlap clusters
  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let currentClusterEnd = -1;

  for (const it of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(it);
      currentClusterEnd = it.end;
    } else if (it.start < currentClusterEnd - 0.001) {
      // Overlaps with current cluster
      currentCluster.push(it);
      currentClusterEnd = Math.max(currentClusterEnd, it.end);
    } else {
      // Non-overlapping gap found, close cluster and start new one
      clusters.push(currentCluster);
      currentCluster = [it];
      currentClusterEnd = it.end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Assign columns within each cluster
  const results: PositionedTimelineItem<T>[] = [];

  for (const cluster of clusters) {
    const colEndTimes: number[] = [];
    const clusterAssigned: Array<{
      entry: (typeof items)[0];
      col: number;
    }> = [];

    // Greedily find earliest available column
    for (const entry of cluster) {
      let placedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= entry.start + 0.001) {
          placedCol = c;
          colEndTimes[c] = entry.end;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEndTimes.length;
        colEndTimes.push(entry.end);
      }
      clusterAssigned.push({ entry, col: placedCol });
    }

    const totalCols = Math.max(1, colEndTimes.length);

    // 5. Expand colSpan if adjacent columns on the right are clear of collisions
    for (const { entry, col } of clusterAssigned) {
      let colSpan = 1;
      for (let nextCol = col + 1; nextCol < totalCols; nextCol++) {
        // Check if any item in nextCol collides with this item
        const hasCollision = clusterAssigned.some(
          (other) =>
            other.col === nextCol &&
            Math.max(entry.start, other.entry.start) < Math.min(entry.end, other.entry.end) - 0.001
        );
        if (!hasCollision) {
          colSpan++;
        } else {
          break;
        }
      }

      const leftPercent = (col / totalCols) * 100;
      const widthPercent = (colSpan / totalCols) * 100;

      results.push({
        item: entry.raw,
        column: col,
        totalColumns: totalCols,
        colSpan,
        leftPercent,
        widthPercent,
      });
    }
  }

  return results;
}
