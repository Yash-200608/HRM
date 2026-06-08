import {createSlice, PayloadAction} from "@reduxjs/toolkit";

const initialState = {
    managers: []
}


const managerSlice = createSlice({
    name: "manager",
    initialState,
    reducers: {
        getManagers: (state, action: PayloadAction<any[]>) => {
            state.managers = action.payload;
        }
    }
});

export const { getManagers } = managerSlice.actions;

export default managerSlice.reducer;