const Candidate = require("../../models/job-portal/candidate");
const { Admin } = require("../../models/personalOffice/authModel.js");
const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary.js");

// =============================
// 1️⃣ Add Candidate
// =============================
const addCandidate = async (req, res) => {
    try {
        const data = req.body;


        let resumeUrl = "";
            if (req.files?.resume?.[0]?.buffer) {
              resumeUrl = await uploadToCloudinary(req?.files?.resume?.[0]?.buffer, req?.files?.resume?.[0]?.mimetype)
            }
       let profileImageUrl = "";
        if(req.files?.profileImage?.[0]?.buffer){
            profileImageUrl = await uploadToCloudinary(req?.files?.profileImage?.[0]?.buffer, req?.files?.profileImage?.[0]?.mimetype)
        }

     const candidate = new Candidate({
    ...data,
    ...(resumeUrl && { resume: resumeUrl }), // only add if exists
    ...(profileImageUrl && { profileImage: profileImageUrl }), // only add if exists
});
        await candidate.save();

        res.status(201).json({
            success: true,
            message: "Candidate added successfully",
            data: candidate,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 2️⃣ Get All Candidates
// =============================
const getAllCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find().populate("role", "name").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: candidates.length,
            data: candidates,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 3️⃣ Get Single Candidate
// =============================
const getSingleCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        res.status(200).json({
            success: true,
            data: candidate,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 4️⃣ Update Candidate
// =============================
const updateCandidate = async (req, res) => {
  const { id, ...obj } = req.body;

  try {
    // Resume upload (optional)
    if (req.files?.resume?.[0]?.buffer) {
      const resumeUrl = await uploadToCloudinary(req.files.resume[0].buffer, req?.files?.resume?.[0]?.mimetype);
      obj.resume = resumeUrl; // Add resume URL to update object
    }

        if(req.files?.profileImage?.[0]?.buffer){
            const profileImageUrl = await uploadToCloudinary(req?.files?.profileImage?.[0]?.buffer, req?.files?.profileImage?.[0]?.mimetype);
            obj.profileImage = profileImageUrl;
        }
    // Update candidate
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      obj,
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      data: candidate,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// =============================
// 5️⃣ Delete Candidate
// =============================
const deleteCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findByIdAndDelete(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Candidate deleted successfully",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =============================
// 6️⃣ Update Candidate Status (Controlled Flow)
// =============================
const updateCandidateStatus = async (req, res) => {
    try {
        const { adminId, userId, status } = req.body;
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }
        const candidate = await Candidate.findById(userId);
        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }
        candidate.candidateStatus = status;
        await candidate.save();
        res.status(200).json({
            success: true,
            message: `Candidate status has been updated to "${status}".`,
        });


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


module.exports = {
    addCandidate,
    getAllCandidates,
    getSingleCandidate,
    updateCandidate,
    deleteCandidate,
    updateCandidateStatus
};