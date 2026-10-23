const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js') || f.endsWith('.route.js'));

let totalRoutes = 0;
let totalEndpoints = 0;
let errors = [];

for (const file of routeFiles) {
  const fullPath = path.join(routesDir, file);
  try {
    const router = require(fullPath);
    if (!router || !router.stack) {
      errors.push(`[${file}] does not export an Express router (router.stack is missing)`);
      continue;
    }
    totalRoutes++;

    for (const layer of router.stack) {
      if (layer.route) {
        totalEndpoints++;
        const routePath = layer.route.path;
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        
        for (const handlerLayer of layer.route.stack) {
          if (typeof handlerLayer.handle !== 'function') {
            errors.push(`[${file}] ${methods} ${routePath} has an invalid handler of type ${typeof handlerLayer.handle}`);
          }
        }
      } else if (layer.name === 'router') {
        // nested router
      }
    }
  } catch (err) {
    errors.push(`[${file}] Failed to load: ${err.message}\n${err.stack}`);
  }
}

console.log(`Checked ${totalRoutes} router files, ${totalEndpoints} endpoints.`);
if (errors.length > 0) {
  console.error(`Found ${errors.length} route errors:`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('All router files and route handlers are valid functions!');
}
