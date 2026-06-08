const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary.js");
const EmployeeDocument = require("../../models/personalOffice/employDocumentModel.js")

// 1️⃣ GENERATE / ISSUE DOCUMENT (COMMON FUNCTION)

// 👉 Salary Slip / Offer / NOC / Letter sab isi se banenge

const generateEmployeeDocument = async (req, res) => {
  try {
    const {
      employeeId,
      documentType,
      title,
      metadata,
      previousDocumentId
    } = req.body;

    // ✅ Upload file to cloudinary
    const fileUrl = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : null;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Document file is required"
      });
    }

    // ✅ Archive previous document (if revision)
    if (previousDocumentId) {
      await EmployeeDocument.findByIdAndUpdate(previousDocumentId, {
        status: "ARCHIVED"
      });
    }

    const newDoc = await EmployeeDocument.create({
      employeeId,
      documentType,
      title,
      fileUrl,
      metadata,
      previousDocumentId: previousDocumentId || null,
      issuedBy: "ADMIN",
      status: "ACTIVE"
    });

    res.status(201).json({
      success: true,
      message: "Document generated successfully",
      data: newDoc
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate document",
      error: error.message
    });
  }
};




// 2️⃣ GENERATE SALARY SLIP (MONTHLY SAFE LOGIC)

// 👉 Same month ki duplicate salary slip block karega

const generateSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year, salaryAmount } = req.body;

    // ✅ Check duplicate salary slip
    const alreadyExists = await EmployeeDocument.findOne({
      employeeId,
      documentType: "SALARY_SLIP",
      "metadata.month": month,
      "metadata.year": year,
      status: "ACTIVE"
    });

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Salary slip already generated for this month"
      });
    }

    // ✅ Upload PDF to Cloudinary
    const fileUrl = req.file
      ? await uploadToCloudinary(req.file.buffer)
      : null;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Salary slip PDF is required"
      });
    }

    const salarySlip = await EmployeeDocument.create({
      employeeId,
      documentType: "SALARY_SLIP",
      title: `Salary Slip - ${month}-${year}`,
      fileUrl,
      metadata: {
        month,
        year,
        salaryAmount
      },
      issuedBy: "ADMIN",
      status: "ACTIVE"
    });

    res.status(201).json({
      success: true,
      message: "Salary slip generated successfully",
      data: salarySlip
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating salary slip",
      error: error.message
    });
  }
};


// 3️⃣ GET ALL DOCUMENTS OF EMPLOYEE (HISTORY + LATEST)

const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const documents = await EmployeeDocument.find({ employeeId })
      .sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      data: documents
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error.message
    });
  }
};


// 4️⃣ GET DOCUMENTS BY TYPE (Salary Slips / Letters)

const getEmployeeDocumentsByType = async (req, res) => {
  try {
    const { employeeId, documentType } = req.params;

    const docs = await EmployeeDocument.find({
      employeeId,
      documentType
    }).sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      data: docs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error.message
    });
  }
};


// 5️⃣ QUICK ADMIN SUMMARY (IMPORTANT FOR UI)

// 👉 Employee ko kitne months salary mil chuki hai + total slips


const getSalarySummary = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const slips = await EmployeeDocument.find({
      employeeId,
      documentType: "SALARY_SLIP"
    });

    const totalMonthsPaid = slips.length;
    const totalSalaryPaid = slips.reduce(
      (sum, slip) => sum + (slip.metadata?.salaryAmount || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalMonthsPaid,
        totalSalaryPaid
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch salary summary",
      error: error.message
    });
  }
};





module.exports = { generateEmployeeDocument, generateSalarySlip, getEmployeeDocuments, getEmployeeDocumentsByType, getSalarySummary };