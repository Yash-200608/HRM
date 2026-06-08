const { Employee } = require('../models/personalOffice/employeeModel');
const Letter = require('../models/personalOffice/Letter');
const PDFDocument = require('pdfkit');


async function generateOfferLetter(employeeId, letterType) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // Red border around page
  doc.rect(0, 0, doc.page.width, doc.page.height).lineWidth(4).strokeColor('red').stroke();

  // ---------------- HEADER ----------------
  const headerHeight = 60;
  doc.rect(0, 0, doc.page.width, headerHeight).fill('#b91c1c');

  // Logo Top-left
  const logoPath = __dirname + '/../assets/image.png';
doc.image(logoPath, 50, 15, { width: 80, height: 30 }); // x, y, width, height

  // Company info Top-right
  const companyInfo = `INFONIC SOLUTIONS
A Unit of Infonic Consultancy Services Pvt Ltd
H.O: 2nd Floor, Krishna Tower, Heera Nagar Mode,
DCM, Ajmer Rd. Jaipur`;
  doc.fillColor('white').fontSize(9).text(companyInfo, 30, 15, { align: 'right', width: doc.page.width - 60 });

  // ---------------- LETTER TITLE ----------------
  const titleY = headerHeight + 20;
  doc.rect(150, titleY, 300, 30).fill('white').strokeColor('#1d4ed8').lineWidth(1.5).stroke();
  doc.fillColor('#1d4ed8').fontSize(14).text(`${letterType.toUpperCase()} LETTER`, 0, titleY + 7, { align: 'center' });

  // ---------------- EMPLOYEE INFO ----------------
  let currentY = titleY + 60;
  doc.fillColor('black').fontSize(11);
  doc.text('To,', 50, currentY);
  currentY += 15;
  doc.font('Helvetica-Bold').text(employee.fullName || 'Employee Name', 50, currentY);
  currentY += 15;
  doc.font('Helvetica').text(employee.address || 'Jaipur', 50, currentY);
  currentY += 20;

  // Subject
  doc.font('Helvetica-Bold').text(`Subject: Welcome to Infonic Solution`, 50, currentY);
  currentY += 20;

  // Dear Employee
  doc.font('Helvetica').text(`Dear ${employee.fullName || 'Employee Name'},`, 50, currentY);
  currentY += 20;

  // ---------------- BODY CONTENT ----------------
  const joiningDate = employee.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "07/Jan/2026";

  doc.text(`We are delighted to welcome you to Infonic Solution as ${employee.designation || 'Frontend Developer'}. We feel confident in your skills and the experience you bring to the role. We are sure you will be a great addition to our team.`, { align: 'left', width: 500 });
  currentY = doc.y + 10;

  doc.text(`As per our prior discussion, you will start your employment on ${joiningDate}. Your reporting will be handled by ${employee.reportingTo || 'Priyank Dadhich'}. You are required to arrive at 9:00 AM and report to DCM Office, Jaipur.`, { width: 500 });
  currentY = doc.y + 10;

  doc.text(`Here is a brief overview of your employment:`, { underline: true });
  currentY = doc.y + 5;

  // Employment overview table style
  const overview = [
    `Position: ${employee.designation || 'Frontend Developer'}`,
    `Department: ${employee.department || 'Development'}`,
    `Reporting to: ${employee.reportingTo || 'Priyank Dadhich'}`,
    `Joining Date: ${joiningDate}`,
    `Compensation: ${employee.monthSalary || '15000/ Month'}`
  ];
  overview.forEach(line => {
    doc.text(line, { indent: 20 });
  });

  currentY = doc.y + 10;

  doc.text(`As per our company rules, we would like you to bring the following documents on your first day:`);
  doc.text(`• Aadhar Card, Pan Card`, { indent: 20 });
  currentY = doc.y + 10;

  doc.text(`Please do not hesitate to reach out to Kavita Dadhich at 8078644758 if you have any questions.`, { width: 500 });
  doc.moveDown(0.5);
  doc.text(`We are optimistic about your contribution and wish you a bright and fulfilling career with Infonic Solution.`, { width: 500 });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Welcome aboard!`, { width: 500 });

  // Regards
  doc.moveDown(1);
  doc.font('Helvetica').text(`Regards,`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Miss. Kavita Dadhich`);
  doc.text(`(HR Executive)`);


  // ---------------- FOOTER ----------------
  const footerY = 772;
  const footerHeight = 25;
  const fullWidth = doc.page.width; // poora page width
  const footerWidth = fullWidth / 3; // 3 equal parts

  // Left red (Mobile)
  doc.rect(0, footerY, footerWidth, footerHeight).fill('#b91c1c');
  doc.fillColor('white').fontSize(10)
    .text('Mob: 9782860519', 0, footerY + 7, { width: footerWidth, align: 'center' }); // center align

  // Center blue (Website)
  doc.rect(footerWidth, footerY, footerWidth, footerHeight).fill('#1d4ed8');
  doc.fillColor('white').text('www.infonicsolution.com', footerWidth, footerY + 7, { width: footerWidth, align: 'center' });

  // Right red (Email)
  doc.rect(footerWidth * 2, footerY, footerWidth, footerHeight).fill('#b91c1c');
  doc.fillColor('white').text('infonicsolutions@gmail.com', footerWidth * 2, footerY + 7, { width: footerWidth, align: 'center' }); // center align

  doc.end();

  // ---------------- SAVE TO MONGODB ----------------
  return new Promise((resolve, reject) => {
    let pdfBuffer = [];
    doc.on('data', (chunk) => pdfBuffer.push(chunk));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(pdfBuffer);
      const letter = new Letter({
        employeeId: employee._id,
        letterType,
        pdfData
      });
      await letter.save();
      resolve(pdfData);
    });

    doc.on('error', (err) => reject(err));
  });
}

module.exports = { generateOfferLetter };
