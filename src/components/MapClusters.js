// Кластеризация меток на клиенте: 9 больших кружков (владения),
// при наведении вокруг раскрываются кружки типов, при зуме — метки на своих местах.
import L from "leaflet";

// Порог зума: ниже — кластеры, выше — обычные метки
export const CLUSTER_ZOOM_THRESHOLD = -1.25;

// k-means++ на 9 групп
function kmeans(points, k, iterations = 40) {
  if (points.length <= k) {
    return points.map((p, i) => ({ center: [p[0], p[1]], members: [i] }));
  }

  // Инициализация: равномерно по сортировке (стабильный результат)
  const sorted = points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);

  let centers = [];
  for (let c = 0; c < k; c++) {
    const idx = Math.floor((c + 0.5) * (sorted.length / k));
    centers.push([...sorted[Math.min(idx, sorted.length - 1)].p]);
  }

  let assignment = new Array(points.length).fill(0);

  for (let it = 0; it < iterations; it++) {
    let changed = false;

    points.forEach((p, i) => {
      let best = 0;
      let bestDist = Infinity;
      centers.forEach((c, ci) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      if (assignment[i] !== best) { assignment[i] = best; changed = true; }
    });

    const sums = centers.map(() => [0, 0, 0]);
    points.forEach((p, i) => {
      const a = assignment[i];
      sums[a][0] += p[0];
      sums[a][1] += p[1];
      sums[a][2] += 1;
    });

    centers = centers.map((c, ci) => {
      const s = sums[ci];
      return s[2] ? [s[0] / s[2], s[1] / s[2]] : c;
    });

    if (!changed) break;
  }

  const groups = centers.map((center) => ({ center, members: [] }));
  points.forEach((p, i) => groups[assignment[i]].members.push(i));
  return groups.filter((g) => g.members.length > 0);
}

// Раскладываем кружки типов по окружности вокруг центра кластера
function layoutSatellites(center, typeEntries, radius) {
  const n = typeEntries.length;
  return typeEntries.map((entry, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      ...entry,
      pos: [
        center[0] + Math.sin(angle) * radius,
        center[1] + Math.cos(angle) * radius,
      ],
      angle,
    };
  });
}

export function buildClusters(markers, { k = 9, radius = 55 } = {}) {
  const points = markers.map((m) => m.coords);
  const groups = kmeans(points, k);

  return groups.map((group, gi) => {
    const items = group.members.map((i) => markers[i]);

    // Группировка по типу
    const byType = new Map();
    items.forEach((m) => {
      if (!byType.has(m.type)) byType.set(m.type, []);
      byType.get(m.type).push(m);
    });

    const typeEntries = [...byType.entries()].map(([type, list]) => ({
      type,
      count: list.length,
      markers: list,
    }));

    // Радиус раскрытия зависит от количества типов
    const r = radius + Math.max(0, typeEntries.length - 4) * 8;

    return {
      id: `cluster-${gi}`,
      center: group.center,
      total: items.length,
      types: layoutSatellites(group.center, typeEntries, r),
      radius: r,
    };
  });
}

export function createClusterIcon(cluster, isHovered) {
  const size = isHovered ? 76 : 64;
  return L.divIcon({
    className: "",
    html: `
      <div class="map-cluster ${isHovered ? "is-hovered" : ""}" style="width:${size}px;height:${size}px">
        <span class="map-cluster-count">${cluster.total}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createSatelliteIcon(entry, iconUrl, isAlchemy) {
  const cls = isAlchemy ? "map-satellite-alchemy" : "map-satellite";
  return L.divIcon({
    className: "",
    html: `
      <div class="${cls}">
        <img src="${iconUrl}" alt="" />
        <span class="map-satellite-count">${entry.count}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}
