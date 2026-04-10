const Branch = require('../models/Branch');

/**
 * Migration Script: Flat location {lat, long} -> GeoJSON {type: 'Point', coordinates: [long, lat]}
 * This is idempotent and can be run multiple times safely.
 */
const migrateToGeoJSON = async () => {
  try {
    const branches = await Branch.find();
    console.log(`[Migration] Audit started. Checking ${branches.length} branches for legacy geospatial metadata...`);

    let migratedCount = 0;

    for (const branch of branches) {
      // Check for legacy structure: where 'coordinates' does not exist but 'lat'/'long' might be stored 
      // directly in the legacy objects or if we are verifying structure.
      // Since we changed the model to default 'Point', we check if coordinates array is empty or missing.
      
      const loc = branch.location;
      
      // If the location is already a Point with coordinates, skip
      if (loc && loc.type === 'Point' && loc.coordinates && loc.coordinates.length === 2) {
        continue;
      }

      // If we have legacy data (stored in the branch object before model change)
      // Note: Mongoose might have stripped 'lat'/'long' if the model changed, 
      // so we use .toObject({ depopulate: true }) or access the raw data if possible.
      // However, if the server was restarted with the NEW model, the OLD fields are still in MongoDB.
      
      const rawBranch = branch.toObject();
      const legacyLat = rawBranch.location?.lat;
      const legacyLong = rawBranch.location?.long;

      if (legacyLat && legacyLong) {
        branch.location = {
          type: 'Point',
          coordinates: [parseFloat(legacyLong), parseFloat(legacyLat)],
          googleMapsUrl: rawBranch.location.googleMapsUrl
        };
        await branch.save();
        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`[Migration] Success. ${migratedCount} branches transitioned to GeoJSON Point format.`);
    } else {
      console.log(`[Migration] System is synchronized. No legacy data found.`);
    }
  } catch (err) {
    console.error(`[Migration] Error during geospatial transition:`, err.message);
  }
};

module.exports = migrateToGeoJSON;
