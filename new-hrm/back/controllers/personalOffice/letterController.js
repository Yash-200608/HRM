const fs = require("fs");

const PdfLetter = require(
  "../../models/personalOffice/letterModel"
);

const { Admin } = require(
  "../../models/personalOffice/authModel"
);

const { Employee } = require(
  "../../models/personalOffice/employeeModel"
);

exports.uploadLetter = async (
  req,
  res
) => {

  try {

    const {
      employeeId,
      companyId,
      adminId,
      letterType,
    } = req.body;

    // CHECK USER

     console.log("BODY =>", req.body);
    console.log("FILE =>", req.file);

    let user =
      await Admin.findOne({
        _id: adminId,
        companyId,
      });

    if (!user) {

      user =
        await Employee.findOne({
          _id: adminId,
          createdBy: companyId,
        }).populate(
          "assignedRole"
        );
    }

    if (!user) {

      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    // PERMISSION CHECK

    let hasPermission = false;

    if (user.role === "admin") {

      hasPermission = true;

    } else {

      const permissions =
        user?.assignedRole
          ?.permissions || {};

      hasPermission =
        permissions?.employees
          ?.edit === true;
    }

    if (!hasPermission) {

      return res.status(403).json({
        message:
          "No permission to upload letters",
      });
    }

    if (!req.file) {

      return res.status(400).json({
        message: "PDF required",
      });
    }

    // DELETE OLD FILE

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

    // UPDATE OR CREATE

    if (existingLetter) {

      existingLetter.pdfUrl =
        pdfUrl;

      existingLetter.originalName =
        req.file.originalname;

      existingLetter.size =
        req.file.size;

      existingLetter.uploadedBy =
        adminId;

      await existingLetter.save();

    } else {

      await PdfLetter.create({
        employeeId,
        companyId,
        uploadedBy: adminId,
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

    const letters = await PdfLetter.find({
      employeeId: employeeId,
    });
console.log("EMPLOYEE ID", employeeId);
console.log("LETTERS", letters);
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