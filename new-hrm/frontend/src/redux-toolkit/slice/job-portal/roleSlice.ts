import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AttendanceState {
    roles: any[];
}

const initialState: AttendanceState = {
    roles: []
};

const roleSlice = createSlice({
    name: "roles",
    initialState,
    reducers: {
        getRoles: (state, action: PayloadAction<any[]>) => {
            state.roles = action.payload;
        }
    }
})

export const { getRoles } = roleSlice.actions;
export default roleSlice.reducer;