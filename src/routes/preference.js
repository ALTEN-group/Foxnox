// @ts-check
import express from "express";

const router = express.Router();

import pEnt from "../entities/preference.js";
import { filterByIdAndUserIdAndResource } from "../middlewares/filters/byIdAndUserIdAndResource.js";
import { assertRowsOwnedAndUnlocked } from "../middlewares/mappers/preference/assertRowsOwnedAndUnlocked.js";
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
// Fail-closed pre-flight: reject unless every req.body.rows[].id is owned by
// the caller, unlocked, and belongs to :resource (see assertRowsOwnedAndUnlocked).
router.put(
  "/:resource",
  mapConsumer,
  assertRowsOwnedAndUnlocked,
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
