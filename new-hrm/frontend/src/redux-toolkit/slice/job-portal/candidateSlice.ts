import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    candidates: []
}

const candidateSlice = createSlice({
    name: "candidates",
    initialState,
    reducers: {
        getCandidates: (state, action: PayloadAction<any[]>) => {
            state.candidates = action.payload;
        },
    },
})

export const { getCandidates } = candidateSlice.actions;
export default candidateSlice.reducer;
