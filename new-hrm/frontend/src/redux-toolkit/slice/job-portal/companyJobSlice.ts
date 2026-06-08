import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    companyJobList: []
}

const companyJobSlice = createSlice({
    name: "companyJob",
    initialState,
    reducers: {
        getCompanyJobList: (state, action: PayloadAction<any[]>) => {
            state.companyJobList = action.payload;
        },
    },
})

export const { getCompanyJobList } = companyJobSlice.actions;
export default companyJobSlice.reducer;
