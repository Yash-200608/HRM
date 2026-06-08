const cloudinary = require("./cloudinaryConfig");

// const uploadToCloudinary = (fileBuffer, folder = "employees") => {
//   return new Promise((resolve, reject) => {
//     if (!fileBuffer) {
//       return reject(new Error("No file buffer provided"));
//     }

//     cloudinary.uploader
//       .upload_stream({ folder }, (error, result) => {
//         if (error) return reject(error);
//         resolve(result.secure_url);
//       })
//       .end(fileBuffer);
//   });
// };


const uploadToCloudinary = (fileBuffer, mimetype, folder = "employees") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return reject(new Error("No file buffer provided"));

    // Determine resource type
    let resource_type = "image"; // default
    if (mimetype.startsWith("video/")) resource_type = "video";
    else if (mimetype.startsWith("audio/")) resource_type = "video"; // Cloudinary me audio ko video resource ke under upload karte hai
    else if (mimetype === "application/pdf") resource_type = "raw"; // PDF ya docs ke liye "raw"

    cloudinary.uploader
      .upload_stream({ folder, resource_type }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      })
      .end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;
