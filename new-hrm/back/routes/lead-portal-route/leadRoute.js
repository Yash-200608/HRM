const router = require("express").Router();
const { addLead, getLeads,updatePaymentStatus, getLeadById,addPayment, updateLead, deleteLead, updateLeadStatus } = require("../../controllers/lead-portal/leadController");

router.post("/add", addLead);
router.get("/get", getLeads);
router.get("/getbyid/:id", getLeadById);
router.put("/update/:id", updateLead);
router.delete("/delete/:id", deleteLead);
router.patch("/status", updateLeadStatus);
router.patch("/payment", addPayment)
router.patch("/payment/status", updatePaymentStatus)
module.exports = router;