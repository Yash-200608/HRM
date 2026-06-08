const nodemailer = require("nodemailer");


// ✅ Transporter (ek hi baar create hoga)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Reusable function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Office Management" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || "",
      html: html || "",
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.response);

    return {
      success: true,
      messageId: info.messageId,
    };

  } catch (error) {
    console.error("❌ Email error:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = sendEmail;