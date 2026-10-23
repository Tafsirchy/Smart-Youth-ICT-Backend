const profile = require('./user/profile.controller');
const admin = require('./user/admin.controller');
const staff = require('./user/staff.controller');
const publicCtrl = require('./user/public.controller');
const bulk = require('./user/bulk.controller');

module.exports = {
  ...profile,
  ...admin,
  ...staff,
  ...publicCtrl,
  ...bulk,
};
