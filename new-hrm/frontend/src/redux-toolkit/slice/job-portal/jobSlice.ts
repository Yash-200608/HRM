import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    jobList: []
}

const jobSlice = createSlice({
    name: "job",
    initialState,
    reducers: {
        getJobList: (state, action: PayloadAction<any[]>) => {
            state.jobList = action.payload;
        },
    },
})

export const { getJobList } = jobSlice.actions;
export default jobSlice.reducer;
