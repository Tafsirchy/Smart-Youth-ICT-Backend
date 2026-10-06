const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const { parseLocation } = require('./geoPoint');

/**
 * Migration Script — repairs the Branch `location` field.
 *
 * Two shapes are fixed here:
 *  1. Legacy flat `{ lat, long }` → GeoJSON `{ type: 'Point', coordinates: [long, lat] }`
 *  2. Invalid/partial `location` objects (e.g. `{ type: 'Point', googleMapsUrl: '' }`
 *     with no `coordinates`) → field removed, because MongoDB's `2dsphere` index
 *     rejects them ("Can't extract geo keys ... Point must be an array or object").
 *
 * The raw collection driver is used on purpose: Mongoose strips the legacy
 * `lat`/`long` keys while hydrating, so they can only be read from BSON.
 *
 * Idempotent — safe to run on every cold start or manually.
 */
const migrateToGeoJSON = async () => {
  try {
    if (!mongoose.connection.readyState) {
      console.log('[Migration] Skipped: database connection is not ready.');
      return { migrated: 0, repaired: 0, total: 0 };
    }

    const cursor = Branch.collection.find({}, { projection: { location: 1 } });

    let migrated = 0; // legacy lat/long → GeoJSON
    let repaired = 0; // invalid location object → removed
    let total = 0;

    for await (const branch of cursor) {
      total += 1;
      const raw = branch.location;

      // Nothing to repair.
      if (raw === undefined || raw === null) continue;

      const parsed = parseLocation(raw);

      if (parsed.valid && parsed.point) {
        // Already a Point, but rewrite when the stored shape/values drifted —
        // e.g. string coordinates, which a 2dsphere index would reject.
        const stored = raw.coordinates;
        const sameShape =
          raw.type === 'Point' &&
          Array.isArray(stored) &&
          stored.length === 2 &&
          typeof stored[0] === 'number' &&
          typeof stored[1] === 'number' &&
          stored[0] === parsed.point.coordinates[0] &&
          stored[1] === parsed.point.coordinates[1];

        if (sameShape) continue;

        await Branch.collection.updateOne({ _id: branch._id }, { $set: { location: parsed.point } });
        migrated += 1;
        continue;
      }

      // Invalid / partial object → drop the field so the index stays usable.
      await Branch.collection.updateOne({ _id: branch._id }, { $unset: { location: '' } });
      repaired += 1;
    }

    if (migrated || repaired) {
      console.log(
        `[Migration] GeoJSON sync complete. ${migrated} legacy location(s) converted, ` +
          `${repaired} invalid location(s) removed (of ${total} branches).`
      );
    } else {
      console.log(`[Migration] System is synchronized. Checked ${total} branches.`);
    }

    return { migrated, repaired, total };
  } catch (err) {
    console.error('[Migration] Error during geospatial transition:', err.message);
    return { migrated: 0, repaired: 0, total: 0, error: err.message };
  }
};

module.exports = migrateToGeoJSON;
