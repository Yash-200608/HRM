const express = require("express");
const scimAuthMiddleware = require("../middleware/scimAuthMiddleware.js");
const scimController = require("../controllers/personalOffice/scimController.js");

const router = express.Router();

router.get("/ServiceProviderConfig", scimAuthMiddleware, scimController.serviceProviderConfig);
router.get("/Schemas", scimAuthMiddleware, scimController.listSchemas);
router.get("/Schemas/:id", scimAuthMiddleware, scimController.getSchema);
router.get("/Users", scimAuthMiddleware, scimController.listUsers);
router.get("/Users/:id", scimAuthMiddleware, scimController.getUser);
router.post("/Users", scimAuthMiddleware, scimController.unsupportedMutation);
router.put("/Users/:id", scimAuthMiddleware, scimController.unsupportedMutation);
router.patch("/Users/:id", scimAuthMiddleware, scimController.unsupportedMutation);
router.delete("/Users/:id", scimAuthMiddleware, scimController.unsupportedMutation);

module.exports = router;