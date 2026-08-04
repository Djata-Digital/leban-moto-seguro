export type MapPosition = {
  latitude: number;
  longitude: number;
};

export function calculateDistanceKm(
  pointA: MapPosition,
  pointB: MapPosition,
) {
  const earthRadiusKm = 6371;

  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const deltaLatitude = toRadians(
    pointB.latitude - pointA.latitude,
  );

  const deltaLongitude = toRadians(
    pointB.longitude - pointA.longitude,
  );

  const latitudeA = toRadians(
    pointA.latitude,
  );

  const latitudeB = toRadians(
    pointB.latitude,
  );

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    );

  return earthRadiusKm * angularDistance;
}

export function calculateEstimatedMinutes(
  distanceKm: number,
) {
  if (
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    return 0;
  }

  if (distanceKm <= 0.03) {
    return 0;
  }

  const estimatedSpeedKmH =
    distanceKm <= 0.5
      ? 12
      : distanceKm <= 2
        ? 25
        : 35;

  return Math.max(
    1,
    Math.ceil(
      (distanceKm /
        estimatedSpeedKmH) *
        60,
    ),
  );
}

export function formatDistance(
  distanceKm: number,
) {
  if (!Number.isFinite(distanceKm)) {
    return '—';
  }

  if (distanceKm < 1) {
    return `${Math.round(
      distanceKm * 1000,
    )} m`;
  }

  return `${distanceKm.toFixed(2)} km`;
}

export function formatEstimatedTime(
  minutes: number,
) {
  if (!Number.isFinite(minutes)) {
    return '—';
  }

  if (minutes <= 0) {
    return 'Chegou ao local';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  const remainingMinutes =
    minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}