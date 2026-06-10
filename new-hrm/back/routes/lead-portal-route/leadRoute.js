const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const {
  addLead,
  getLeads,
  updatePaymentStatus,
  getLeadById,
  addPayment,
  updateLead,
  deleteLead,
  updateLeadStatus,
} = require("../../controllers/lead-portal/leadController");

const { access, mutation } = createPortalGuards("leadportal");

router.post("/add", mutation, access, addLead);
router.get("/get", access, getLeads);
router.get("/getbyid/:id", access, getLeadById);
router.get("/getbyid", access, getLeadById);
router.put("/update/:id", mutation, access, updateLead);
router.delete("/delete/:id", mutation, access, deleteLead);
router.patch("/status", mutation, access, updateLeadStatus);
router.patch("/payment", mutation, access, addPayment);
router.patch("/payment/status", mutation, access, updatePaymentStatus);

module.exports = router;
