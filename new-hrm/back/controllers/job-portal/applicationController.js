const Application = require("../../models/job-portal/application"); // Path according to your project
const Jobs = require("../../models/job-portal/jobs");
const User = require("../../models/job-portal/candidate");

const resolveRequestId = (req) => req.params.id || req.query.id || req.body.id;

// =======================
// Create a new application
// =======================
const createApplication = async (req, res) => {
  try {
    const { jobId, applicantId, coverLetter } = req.body;

    // Check if job exists
    const job = await Jobs.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    // Check if applicant exists
    const user = await User.findById(applicantId);
    if (!user) {
      return res.status(404).json({ message: "Applicant not found." });
    }

    // Prevent duplicate application
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: applicantId,
    });

    if (existingApplication) {
      return res.status(409).json({ message: "You have already applied for this job." });
    }

    // Create new application
    const application = await Application.create({
      job: jobId,
      applicant: applicantId,
      coverLetter: coverLetter || null,
      status: "applied",
    });

    if(application?._id && !job?.applications.includes(application?._id)){
      job.applications.push(application?._id)
      await job.save();
    }

    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// Get all applications (optionally filter by job or applicant)
// =======================
const getApplications = async (req, res) => {
  try {
  
    const filter = { isDeleted: false };

  const applications = await Application.find()
  .populate("job") // Job ke selected fields
  .populate({
    path: "applicant",
    populate: {
      path: "role",        // applicant ke role field ko populate karna
      select: "name description", // role ke fields
    },
  });

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// Get single application by ID
// =======================
const getApplicationById = async (req, res) => {
  try {
    const id = resolveRequestId(req);
    if (!id) {
      return res.status(400).json({ success: false, message: "Application id is required." });
    }

    const application = await Application.findById(id)
      .populate("job", "jobTitle companyName locationType")
      .populate("applicant", "name email");

    if (!application || application.isDeleted) {
      return res.status(404).json({ message: "Application not found." });
    }

    res.status(200).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// Update application (status, feedback, resume, coverLetter)
// =======================
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params; // Application ID
    const { jobId, applicantId, coverLetter } = req.body;

    const application = await Application.findById(id);
    if (!application || application.isDeleted) {
      return res.status(404).json({ message: "Application not found." });
    }

    // Update fields if provided
    if (jobId) application.job = jobId;
    if (applicantId) application.applicant = applicantId;
    if (coverLetter !== undefined) application.coverLetter = coverLetter;

    await application.save();

    res.status(200).json({
      success: true,
      message: "Application updated successfully.",
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// Soft delete application
// =======================
const deleteApplication = async (req, res) => {
  try {
    const id = resolveRequestId(req);
    if (!id) {
      return res.status(400).json({ success: false, message: "Application id is required." });
    }

    const application = await Application.findById(id);
    if (!application || application.isDeleted) {
      return res.status(404).json({ message: "Application not found." });
    }

    application.isDeleted = true;
    await application.save();

    res.status(200).json({ success: true, message: "Application deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// =============================
// 6️⃣ Update Application Status (Controlled Flow)
// =============================
const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId, status } = req.body;
     
        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found",
            });
        }
        application.status = status;
        await application.save();
        res.status(200).json({
            success: true,
            message: `Application status has been updated to "${status}".`,
        });


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
};
