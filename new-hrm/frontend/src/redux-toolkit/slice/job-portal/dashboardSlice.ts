import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    dashboardJobList: [],
    dashboardSummary:null,
    dashboardOverview:null,
    dashboardPanel:null,
}

const dashboardSlice = createSlice({
    name: "job-Dashobard",
    initialState,
    reducers: {
        getDashboardJobList: (state, action: PayloadAction<any[]>) => {
            state.dashboardJobList = action.payload;
        },
         getDashboardSummaryData: (state, action: PayloadAction<any>) => {
            state.dashboardSummary = action.payload;
        },
         getDashboardOverviewData: (state, action: PayloadAction<any>) => {
            state.dashboardOverview = action.payload;
        },
         getDashboardPanelData: (state, action: PayloadAction<any>) => {
            state.dashboardPanel = action.payload;
        },
    },
})

export const { getDashboardJobList, getDashboardSummaryData, getDashboardOverviewData, getDashboardPanelData } = dashboardSlice.actions;
export default dashboardSlice.reducer;
