/**
 * GeoJSON helpers for the Branch `location` field.
 *
 * The `branches` collection carries a MongoDB `2dsphere` index. That index only
 * accepts a document when `location` is either absent or a valid GeoJSON Point.
 * As soon as a document stores a *partial* `location` (for example
 * `{ type: 'Point', googleMapsUrl: '' }` with no `coordinates`) the server rejects
 * the write with:
 *
 *   Can't extract geo keys: { ... }  Point must be an array or object, instead got type missing
 *
 * Clients legitimately send `location: { lat: '', long: '' }` when the admin never
 * picked a point on the map, so every write path must normalise the payload and
 * drop the field entirely instead of persisting a half-built Point.
 */

const LATITUDE_RANGE = { min: -90, max: 90 };
const LONGITUDE_RANGE = { min: -180, max: 180 };

const isBlank = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

const toCoordinate = (value) => {
  if (isBlank(value)) return null;
  const parsed = Number(typeof value === 'string' ? value.trim() : value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Build a GeoJSON Point, or `null` when the pair is unusable/out of range.
 * @returns {{ type: 'Point', coordinates: [number, number], googleMapsUrl?: string } | null}
 */
const buildPoint = (longitude, latitude, googleMapsUrl) => {
  if (latitude === null || longitude === null) return null;
  if (latitude < LATITUDE_RANGE.min || latitude > LATITUDE_RANGE.max) return null;
  if (longitude < LONGITUDE_RANGE.min || longitude > LONGITUDE_RANGE.max) return null;

  const point = { type: 'Point', coordinates: [longitude, latitude] };

  if (typeof googleMapsUrl === 'string' && googleMapsUrl.trim()) {
    point.googleMapsUrl = googleMapsUrl.trim();
  }

  return point;
};

/**
 * True when a stored/persisted `location` object is safe for a 2dsphere index.
 * @param {object} location
 */
const isValidPoint = (location) => {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return false;
  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) return false;

  const [longitude, latitude] = location.coordinates.map(toCoordinate);

  return buildPoint(longitude, latitude, location.googleMapsUrl) !== null;
};

/**
 * Normalise any incoming location payload.
 *
 * Accepted shapes:
 *   - `undefined` / `null`
 *   - `{ lat, long }` (what the dashboard map picker sends)
 *   - `{ type: 'Point', coordinates: [long, lat] }` (already GeoJSON)
 *
 * @returns {{ provided: boolean, valid: boolean, point?: object, error?: string }}
 *   `valid: true` + no `point` means "caller did not supply coordinates" and the
 *   field must be omitted from the write.
 */
const parseLocation = (input) => {
  if (isBlank(input)) {
    return { provided: false, valid: true };
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    return { provided: true, valid: false, error: 'location must be an object' };
  }

  // Already GeoJSON — re-validate instead of trusting the payload.
  if (Array.isArray(input.coordinates)) {
    const point = buildPoint(
      toCoordinate(input.coordinates[0]),
      toCoordinate(input.coordinates[1]),
      input.googleMapsUrl
    );

    if (!point) {
      return {
        provided: true,
        valid: false,
        error:
          'location.coordinates must be a [longitude, latitude] pair with longitude between -180 and 180 and latitude between -90 and 90',
      };
    }

    return { provided: true, valid: true, point };
  }

  const rawLatitude = input.lat ?? input.latitude;
  const rawLongitude = input.long ?? input.lng ?? input.lon ?? input.longitude;

  // Nothing usable supplied → omit the field, do not persist an empty Point.
  if (isBlank(rawLatitude) && isBlank(rawLongitude)) {
    return { provided: false, valid: true };
  }

  if (isBlank(rawLatitude) || isBlank(rawLongitude)) {
    return {
      provided: true,
      valid: false,
      error: 'Both latitude and longitude are required to save a branch location',
    };
  }

  const point = buildPoint(
    toCoordinate(rawLongitude),
    toCoordinate(rawLatitude),
    input.googleMapsUrl
  );

  if (!point) {
    return {
      provided: true,
      valid: false,
      error:
        'Invalid location: latitude must be a number between -90 and 90 and longitude between -180 and 180',
    };
  }

  return { provided: true, valid: true, point };
};

module.exports = { parseLocation, isValidPoint, buildPoint };
