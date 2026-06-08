import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Company, recentActivity } from "@/types";

// 1️⃣ Define state type
interface CompanyState {
  company: Company[];
  recentActivities: recentActivity[];
}

// 2️⃣ Initial state
const initialState: CompanyState = {
  company: [],
    recentActivities: [],
};

// 3️⃣ Create slice
const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    getCompany: (state, action: PayloadAction<Company[]>) => {
      state.company = action.payload; // ✅ type safe
    },
    getRecentActivities: (state, action: PayloadAction<recentActivity[]>) => {
      state.recentActivities = action.payload;
    },
  },
});

// 4️⃣ Export actions & reducer
export const { getCompany, getRecentActivities } = companySlice.actions;
export default companySlice.reducer;
