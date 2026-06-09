const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const {
  addCandidate,
  getAllCandidates,
  getSingleCandidate,
  updateCandidate,
  deleteCandidate,
  updateCandidateStatus,
} = require("../../controllers/job-portal/candidateController");
const upload = require("../../middleware/upload");

const { access, mutation } = createPortalGuards("jobportal");

router.post(
  "/add",
  mutation,
  access,
  upload.fields([{ name: "resume", maxCount: 1 }, { name: "profileImage", maxCount: 1 }]),
  addCandidate
);
router.get("/get", access, getAllCandidates);
router.get("/getbyid", access, getSingleCandidate);
router.put(
  "/update",
  mutation,
  access,
  upload.fields([{ name: "resume", maxCount: 1 }, { name: "profileImage", maxCount: 1 }]),
  updateCandidate
);
router.delete("/delete/:id", mutation, access, deleteCandidate);
router.patch("/update/status", mutation, access, updateCandidateStatus);

module.exports = router;