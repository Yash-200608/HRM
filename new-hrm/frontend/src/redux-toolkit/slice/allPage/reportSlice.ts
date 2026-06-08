import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface State {
  report: Record<string, any>;
}

const initialState: State = {
  report: {},
};

const reportSlice = createSlice({
    name: "report",
    initialState,
    reducers: {
        getReport: (state, action: PayloadAction<any>) => {
            state.report = action.payload;
        }
    }
});

export const { getReport } = reportSlice.actions;

export default reportSlice.reducer;