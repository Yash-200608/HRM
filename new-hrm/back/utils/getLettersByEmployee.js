// controllers/letterController.js
const Letter = require('../models/personalOffice/Letter');
const { Employee } = require('../models/personalOffice/employeeModel');

/**
 * Fetch letter details by employeeId
 * @param {String} employeeId - Mongoose ObjectId of employee
 * @returns {Object} - Letter data with employee details
 */
async function getLettersByEmployee(employeeId) {
  try {
    // 1️⃣ Fetch letters for this employee
    const letters = await Letter.find({ employeeId: employeeId }).lean(); // lean() returns plain JS objects

    if (!letters || letters.length === 0) {
      return { message: 'No letters found for this employee' };
    }

    // 2️⃣ Optionally, populate employee basic data
    const employee = await Employee.findById(employeeId)
      .select('fullName designation department reportingTo joinDate monthSalary address')
      .lean();

    return letters.map(letter => ({
      letterId: letter._id,
      letterType: letter.letterType,
      pdfData: letter.pdfData, // Buffer
      createdAt: letter.createdAt,
      employee: employee || null,
    }));
  } catch (err) {
    console.error(err);
    throw new Error('Error fetching letters');
  }
}

module.exports = { getLettersByEmployee };
