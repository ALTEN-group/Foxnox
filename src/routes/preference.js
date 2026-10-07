// @ts-check
import express from "express";

const router = express.Router();

import pEnt from "../entities/preference.js";
import { filterByIdAndUserIdAndResource } from "../middlewares/filters/byIdAndUserIdAndResource.js";
import { assertRowsOwnedOrTemplate } from "../middlewares/mappers/preference/assertRowsOwnedOrTemplate.js";
import { getPreferences } from "../middlewares/mappers/preference/getPreferences.js";
import { injectUserIdAndResourceName } from "../middlewares/mappers/preference/injectUserIdAndResourceName.js";
import { mapConsumer } from "../middlewares/mappers/preference/mapConsumer.js";

// Get the merged view list (system templates + this user's own preferences)
router.get("/:resource", mapConsumer, getPreferences);

// Create a preference conf
router.post(
  "/:resource",
  mapConsumer,
  injectUserIdAndResourceName, // inject userId and resourceName to req.body.rows
  pEnt.addArraySubstack, // adds the preference to db
);

// Update preferences.
// Fail-closed pre-flight: reject unless every req.body.rows[].id belongs to
// :resource and is either owned by the caller or a system template (see
// assertRowsOwnedOrTemplate). Templates are never mutated: selecting one records
// the caller's choice and editing one forks a personal copy.
router.put(
  "/:resource",
  mapConsumer,
  assertRowsOwnedOrTemplate,
  pEnt.updateArraySubstack,
);

// Delete a single user-owned preference.
router.delete(
  "/:resource/:id",
  mapConsumer,
  filterByIdAndUserIdAndResource, // injects preference filter
  pEnt.get, // fetches the row to res.locals.rows. Fails with 404 if the preference is not owned by this user
  pEnt.delete, // deletes the row from preference
);

export default router;
