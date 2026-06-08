

export const ValidateEmployeeForm = (formData: any, step: number) => {
  const errors: any = {};

  if (step === 1) {
    // Step 1 fields
    if (!formData?.fullName || formData?.fullName?.trim() === "") {
      errors.fullName = "Full Name is required";
    }
    if (!formData?.email || formData?.email?.trim() === "") {
      errors.email = "Email is required";
    } else {
      // simple email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData?.email)) {
        errors.email = "Invalid email format";
      }
    }
    if(!formData?.password || formData?.password?.trim() === ""){
        errors.password = "Password is required";
    }
    if (!formData?.department || formData?.department?.trim() === "") {
      errors.department = "Department is required";
    }
    if (!formData?.designation || formData?.designation?.trim() === "") {
      errors.designation = "Designation is required";
    }
    if (!formData?.contact || formData?.contact?.trim() === "") {
      errors.contact = "Contact is required";
    } else {
      // simple contact number validation (10 digits)
      const contactRegex = /^\d{10}$/;
      if (!contactRegex.test(formData?.contact)) {
        errors.contact = "Contact must be 10 digits";
      }
    }
    if (!formData?.monthSalary || formData?.monthSalary?.toString()?.trim() === "") {
      errors.monthSalary = "Monthly Salary is required";
    }
  if (!formData?.dateOfBirth) {
  errors.dateOfBirth = "Date of birth is required";
} else {
  const dob = new Date(formData.dateOfBirth);
  const today = new Date();

  if (dob > today) {
    errors.dateOfBirth = "Date of birth cannot be in future";
  }
}
    if (!formData?.joinDate || formData?.joinDate?.trim() === "") {
      errors.joinDate = "Join Date is required";
    }
  }

  if (step === 2) {
    // Step 2 fields
    if (!formData?.employeeType || formData?.employeeType?.trim() === "") {
      errors.employeeType = "Employee Type is required";
    }
    if (!formData?.lpa || formData?.lpa?.toString()?.trim() === "") {
      errors.lpa = "LPA is required";
    }
  }

  return errors;
};