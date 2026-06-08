const router = require("express").Router();
const {
    addCandidate,
    getAllCandidates,
    getSingleCandidate,
    updateCandidate,
    deleteCandidate,
    updateCandidateStatus
} = require("../../controllers/job-portal/candidateController");
const upload = require("../../middleware/upload");


router.post("/add", upload.fields([{ name: "resume", maxCount: 1 }, {name:"profileImage", maxCount:1}]), addCandidate);
router.get("/get", getAllCandidates);
router.get("/getbyid", getSingleCandidate);
router.put("/update",upload.fields([{ name: "resume", maxCount: 1 }, {name:"profileImage", maxCount:1}]), updateCandidate);
router.delete("/delete/:id", deleteCandidate);
router.patch("/update/status", updateCandidateStatus);

module.exports = router;