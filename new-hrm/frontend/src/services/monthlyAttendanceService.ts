import axios from "@/lib/axios";

export const getMonthlyAttendanceReport = (
  params: any
) => {
  return axios.get(
    "/api/monthly-attendance",
    {
      params,
    }
  );
};