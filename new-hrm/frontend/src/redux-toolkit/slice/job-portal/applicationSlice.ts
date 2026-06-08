import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    applicationList: []
}

const applicationSlice = createSlice({
    name: "application",
    initialState,
    reducers: {
        getApplicationList: (state, action: PayloadAction<any[]>) => {
            state.applicationList = action.payload;
        },
    },
})

export const { getApplicationList } = applicationSlice.actions;
export default applicationSlice.reducer;
