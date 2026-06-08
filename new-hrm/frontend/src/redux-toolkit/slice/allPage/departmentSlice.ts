import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    departments: []
}


const departmentSlice = createSlice({
    name: "department",
    initialState,
    reducers: {
        getDepartment: (state, action: PayloadAction<any[]>) => {
            state.departments = action.payload;
        },
        removeDepartment: (state, action) => {
            state.departments = state.departments.filter((d) => d?._id !== action?.payload);
        },

        setDepartment: (state, action) => {
            const exists = state.departments.some( (d) => d._id === action.payload._id );
            if (!exists) {
                state.departments.push(action.payload);
            }
        }
    }
});

export const { getDepartment, removeDepartment, setDepartment } = departmentSlice.actions;

export default departmentSlice.reducer;