import {createSlice, PayloadAction} from "@reduxjs/toolkit";

interface TaskDashboardState {
    taskDashboard: any;
}

const initialState : TaskDashboardState = {
    taskDashboard: {}
}


const taskDashboardSlice = createSlice({
    name: "taskDashboard",
    initialState,
    reducers: {
        getTaskDashboard: (state, action: PayloadAction<any>) => {
            state.taskDashboard = action.payload;
        }
    }
});

export const { getTaskDashboard } = taskDashboardSlice.actions;

export default taskDashboardSlice.reducer;
