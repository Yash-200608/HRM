import { createSlice, PayloadAction } from "@reduxjs/toolkit";


const initialState = {
    allPayRoll: [],
    singlePayRoll:[],
    attendancePayRoll:[]
};


const payrollSlice = createSlice({
    name: "payroll",
    initialState,   
    reducers: {
        getPayroll: (state, action: PayloadAction<any[]>) => {
            state.allPayRoll = action.payload;
        },
            getSinglePayroll: (state, action: PayloadAction<any[]>) => {
            state.singlePayRoll = action.payload;
        },
        getAttendancePayroll: (state, action: PayloadAction<any[]>) => {
            state.attendancePayRoll = action.payload;
        }
    }
});

export const { getPayroll, getSinglePayroll, getAttendancePayroll } = payrollSlice.actions;

export default payrollSlice.reducer;