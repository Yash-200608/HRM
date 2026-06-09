const { sendPlatformEmail } = require("./emailProviderService.js");

const sendEmail = async ({ to, subject, text, html }) => {
  const result = await sendPlatformEmail({ to, subject, text, html });

  if (result.success) {
    console.log(`Email sent via ${result.provider}:`, result.messageId);
  } else {
    console.error("Email delivery failed:", result.error);
  }

  return result;
};

module.exports = sendEmail;