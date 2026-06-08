const Jobs = require("../../models/job-portal/jobs");
const { CompanyJob } = require("../../models/job-portal/companyJob.js")


const createJob = async (req, res) => {
  try {
    const {
      jobTitle,
      companyJobId,
      locationType,
      address,
      description,
      employmentType,
      experience,
      salary,
      skills,
      expiresAt,
      adminId,
      status,
    } = req.body;

    // Check if company exists
    const company = await CompanyJob.findById(companyJobId);
    if (!company)
      return res.status(404).json({ success: false, message: "Company Not Found." });

    // Check for duplicate job (same title in the same company)
    const existingJob = await Jobs.findOne({ companyJobId, jobTitle });
    if (existingJob)
      return res
        .status(409)
        .json({ success: false, message: "This job already exists for this company." });

    // Create new job
    const job = await Jobs.create({
      jobTitle,
      companyJobId,
      locationType,
      address,
      description,
      employmentType,
      experience,
      salary,
      skills,
      expiresAt,
      postedBy: adminId,
      status,
    });
    if(status==="published" && !job?.postedDate){
        job.postedDate = new Date()
       await job.save();
    }

    // Add job to company's jobs array if not already included
    if (!company.jobs.includes(job._id)) {
      company.jobs.push(job._id);
      await company.save();
    }

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getAllJobs = async (req, res) => {
  try {

    const jobs = await Jobs.find()
      .populate("postedBy", "name email")
      .populate("companyJobId", "name email")
      .populate({
        path:"applications",
        populate:{
          path:"applicant"
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getSingleJob = async (req, res) => {
  try {
    const job = await Jobs.findById(req.params.id)
      .populate("postedBy", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateJob = async (req, res) => {
  const { id, status, ...rest } = req.body;

  try {
    const job = await Jobs.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // ✅ Baaki fields update karo
    Object.assign(job, rest);

    // ✅ Status update separately handle karo
    if (status) {
      job.status = status;

      // Agar status published hai to postedDate set karo
      if (status === "published") {
        job.postedDate = new Date();
      }
    }

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Jobs.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const publishJob = async (req, res) => {
  try {
    const job = await Jobs.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    job.status = "published";
    job.postedDate = new Date();
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job published successfully",
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const toggleActiveStatus = async (req, res) => {
   const {status} = req.body;
  try {
    const job = await Jobs.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    job.activeStatus =
      job.activeStatus = status;

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job status updated",
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createJob,
  getAllJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  publishJob,
  toggleActiveStatus,
};