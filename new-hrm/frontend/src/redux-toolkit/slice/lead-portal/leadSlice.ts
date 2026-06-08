import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    leadList: []
}

const leadSlice = createSlice({
    name: "lead",
    initialState,
    reducers: {
        getLeadList: (state, action: PayloadAction<any[]>) => {
            state.leadList = action.payload;
        },
    },
})

export const { getLeadList } = leadSlice.actions;
export default leadSlice.reducer;
