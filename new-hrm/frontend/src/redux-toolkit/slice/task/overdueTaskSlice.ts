import {createSlice, PayloadAction} from "@reduxjs/toolkit";

const initialState = {
    overdueTasks: []
}

const overdueTaskSlice = createSlice({
    name: "overdueTask",
    initialState,
    reducers: {
        getOverdueTasks: (state, action: PayloadAction<any[]>) => {
            state.overdueTasks = action.payload;
        }
    }
});

export const { getOverdueTasks } = overdueTaskSlice.actions;

export default overdueTaskSlice.reducer;