const { CompanyJob } = require("../../models/job-portal/companyJob.js")
const { Admin } = require("../../models/personalOffice/authModel.js");
const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary.js");

const resolveRequestId = (req) => req.params.id || req.query.id || req.body.id;

// Create Company
const createCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      address,
      state,
      country,
      industry,
      type,
      size,
      skills,
      website,
      adminName,
      adminEmail,
      adminContact,
      adminAddress,
      adminId
    } = req.body;


    const admin = await Admin.findOne({ _id: adminId });
    if (!admin) return res.status(404).json({ message: "Admin Not Found." })

    let logoUrl = null;
    if (req.files?.logo?.[0]?.buffer) {
      logoUrl = await uploadToCloudinary(req.files?.logo?.[0]?.buffer, req?.files?.logo?.[0]?.mimetype)
    }


    const newCompany = new CompanyJob({
      name,
      email,
      contact,
      address,
      state,
      country,
      skills,
      industry,
      type,
      size,
      website,
      adminName,
      adminEmail,
      adminContact,
      adminAddress,
      createdBy: adminId, // assuming auth middleware sets req.user
    });
    if (logoUrl !== null) {
      newCompany.logo = logoUrl
    }

    await newCompany.save();

    res.status(201).json({ success: true, message: "New Company Added." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get All Companies
const getCompanies = async (req, res) => {
  try {
    const companies = await CompanyJob.find().populate({
      path:"jobs",
       populate:{
        path:"applications"
       }
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get Single Company by ID
const getCompanyById = async (req, res) => {
  try {
    const id = resolveRequestId(req);
    if (!id) {
      return res.status(400).json({ success: false, message: "Company id is required" });
    }

    const company = await CompanyJob.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update Company
const updateCompany = async (req, res) => {
  try {
    const company = await CompanyJob.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Only update logo if file uploaded
    if (req.files?.logo?.[0]?.buffer) {
      company.logo = await uploadToCloudinary(req.files?.logo?.[0]?.buffer, req?.files?.logo?.[0]?.mimetype);
    }

    const updateFields = [
      "name",
      "skills",
      "email",
      "contact",
      "address",
      "state",
      "country",
      "industry",
      "type",
      "size",
      "website",
      "adminName",
      "adminEmail",
      "adminContact",
      "adminAddress",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();

    res.status(200).json({ success: true, message: "Update Company Added." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete Company
const deleteCompany = async (req, res) => {
  try {
    const id = resolveRequestId(req);
    if (!id) {
      return res.status(400).json({ success: false, message: "Company id is required" });
    }

    const company = await CompanyJob.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await company.deleteOne();
    res.status(200).json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// Delete Company
const updateCompanyStatus = async (req, res) => {
  const { id, status } = req.body;
  try {
    const company = await CompanyJob.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    company.status = status;
    await company.save();
    res.status(200).json({ success: true, message: `Company ${status} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};




module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  updateCompanyStatus
}
