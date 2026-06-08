const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("========= CLOUDINARY CONFIG =========");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API KEY:", process.env.CLOUDINARY_API_KEY ? "FOUND" : "MISSING");
console.log("API SECRET:", process.env.CLOUDINARY_API_SECRET ? "FOUND" : "MISSING");

module.exports = cloudinary;