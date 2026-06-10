const fs = require("fs");

const PdfLetter = require(
  "../../models/personalOffice/letterModel"
);

const { Employee } = require(
  "../../models/personalOffice/employeeModel"
);

const {
  assertSameCompany,
  isSelf,
  resolveEffectiveCompanyId,
} = require("../../utils/authAccess.js");

exports.uploadLetter = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
      letterType,
    } = req.body;

    const companyId = resolveEffectiveCompanyId(req, req.body.companyId);
    const actorId = req.user.id;

    if (!companyId || !employeeId || !letterType) {
      return res.status(400).json({
        message: "companyId, employeeId and letterType are required",
      });
    }

    if (!assertSameCompany(req, res, companyId)) {
      return;
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: companyId,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (req.user.role !== "admin" && !isSelf(req.user, employeeId)) {
      return res.status(403).json({
        message: "No permission to upload letters",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "PDF required",
      });
    }

    const existingLetter =
      await PdfLetter.findOne({
        employeeId,
        letterType,
      });

    if (
      existingLetter?.pdfUrl &&
      fs.existsSync(
        "." +
          existingLetter.pdfUrl
      )
    ) {
      fs.unlinkSync(
        "." +
          existingLetter.pdfUrl
      );
    }

    const pdfUrl =
      `/uploads/letters/${req.file.filename}`;

    if (existingLetter) {
      existingLetter.pdfUrl =
        pdfUrl;

      existingLetter.originalName =
        req.file.originalname;

      existingLetter.size =
        req.file.size;

      existingLetter.uploadedBy =
        actorId;

      await existingLetter.save();
    } else {
      await PdfLetter.create({
        employeeId,
        companyId,
        uploadedBy: actorId,
        letterType,
        pdfUrl,
        originalName:
          req.file.originalname,
        size: req.file.size,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Letter uploaded successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message:
        "Upload failed",
    });
  }
};

exports.getEmployeeLetters = async (req, res) => {
  try {
    const { employeeId } = req.query;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    if (!assertSameCompany(req, res, companyId)) {
      return;
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (req.user.role !== "admin" && !isSelf(req.user, employeeId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const letters = await PdfLetter.find({
      employeeId,
      companyId,
    });

    return res.status(200).json({
      success: true,
      letters,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch letters",
    });
  }
};