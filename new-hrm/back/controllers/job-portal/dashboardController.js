const { CompanyJob } = require("../../models/job-portal/companyJob.js");
const { Admin } = require("../../models/personalOffice/authModel.js");
const Candidate = require("../../models/job-portal/candidate");
const Jobs = require("../../models/job-portal/jobs");
const Application = require("../../models/job-portal/application");

const dashboardSummary = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Total jobs
    const totalJobs = await Jobs.countDocuments();
    const totalJobsCurrentMonth = await Jobs.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    // Active applications
    const activeApplications = await Application.countDocuments({ isDeleted: false });
    const activeApplicationsCurrentMonth = await Application.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    // Interview scheduled
    const interviewScheduled = await Application.countDocuments({ status: "interview" });
    const interviewScheduledCurrentMonth = await Application.countDocuments({
      status: "interview",
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    // Hired candidates
    const hiredCandidates = await Application.countDocuments({ status: "selected" });
    const hiredCandidatesCurrentMonth = await Application.countDocuments({
      status: "selected",
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    res.status(200).json({
      totalJobs,
      totalJobsCurrentMonth,
      activeApplications,
      activeApplicationsCurrentMonth,
      interviewScheduled,
      interviewScheduledCurrentMonth,
      hiredCandidates,
      hiredCandidatesCurrentMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Server error: ${err?.message}` });
  }
};



const dashboardList = async(req, res)=> {
    try{
       const job = await Jobs.find({status:"published",activeStatus:"active"}).sort({createdAt:-1}).limit(8).populate("companyJobId");
       res.status(200).json({message:"data successfully", job})
    }
    catch(err){
        res.status(500).json({message:`server error:- ${err?.message}`})
    }
    
}
// enum: ["applied","screening", "shortlisted", "interview", "selected", "rejected"],

const dashboardApplicationStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const statuses = ["applied","screening","shortlisted","interview","selected","rejected"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        // 1️⃣ Total counts for each status (all-time or this year)
        const totalStats = await Application.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert to object with all statuses
        const totalData = {};
        statuses.forEach(status => totalData[status] = 0);
        totalStats.forEach(item => {
            totalData[item._id] = item.count;
        });

        // 2️⃣ Monthly counts for this year
        const monthlyStats = await Application.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, status: "$status" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Initialize 12 months with 0 counts
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const monthObj = { month: monthNames[i] };
            statuses.forEach(status => monthObj[status] = 0);
            return monthObj;
        });

        // Fill monthly counts
        monthlyStats.forEach(item => {
            const monthIndex = item._id.month - 1; // 0-based index
            monthlyData[monthIndex][item._id.status] = item.count;
        });

        res.status(200).json({
            message: "Dashboard application stats fetched successfully",
            total: totalData,
            monthly: monthlyData
        });

    } catch (err) {
        res.status(500).json({ message: `Server error: ${err?.message}` });
    }
};



module.exports = { dashboardSummary, dashboardList, dashboardList, dashboardApplicationStats };