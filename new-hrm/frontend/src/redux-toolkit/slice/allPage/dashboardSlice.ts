import {createSlice, PayloadAction} from "@reduxjs/toolkit";

interface DashboardState {
    dashboardData: Record<string, any>;
}

const initialState: DashboardState = {
    dashboardData: {}
}


const dashboardSlice = createSlice({
    name: "dashboard",
    initialState,
    reducers: {
        getDashboardData: (state, action: PayloadAction<any>) => {
            state.dashboardData = action.payload;
        }

    }
});

export const {getDashboardData} = dashboardSlice.actions;

export default dashboardSlice.reducer;