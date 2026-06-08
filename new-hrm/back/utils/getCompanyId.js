const getCompanyId = (user) => {
  if (!user) return null;

  console.log("========= GET COMPANY ID =========");
  console.log("USER ROLE:", user.role);
  console.log("USER ID:", user._id);
  console.log("COMPANY ID:", user.companyId);
  console.log("CREATED BY:", user.createdBy);

  // SUPER ADMIN
  if (user.role === "super_admin") {
    return null;
  }

  // ADMIN
  if (user.role === "admin") {
    return user.companyId || user._id;
  }

  // EMPLOYEE / HR / MANAGER
  return user.companyId || user.createdBy || null;
};

module.exports = getCompanyId;