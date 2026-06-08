import {createSlice, PayloadAction} from "@reduxjs/toolkit";

const initialState = {
    subTasks: []
}

const subTaskSlice = createSlice({
    name: "subTask",
    initialState,
    reducers: {
        getSubTasks: (state, action: PayloadAction<any[]>) => {
            state.subTasks = action.payload;
        }
    }
});

export const { getSubTasks } = subTaskSlice.actions;

export default subTaskSlice.reducer;
