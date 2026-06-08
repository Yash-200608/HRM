import {createSlice, PayloadAction} from "@reduxjs/toolkit";

const initialState = {
    tasks: []
}

const taskSlice = createSlice({
    name: "task",
    initialState,
    reducers: {
        getTasks: (state, action: PayloadAction<any[]>) => {
            state.tasks = action.payload;
        }
    }
});

export const { getTasks } = taskSlice.actions;

export default taskSlice.reducer;
