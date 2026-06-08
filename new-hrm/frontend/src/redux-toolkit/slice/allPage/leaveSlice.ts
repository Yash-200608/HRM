import{createSlice, PayloadAction} from "@reduxjs/toolkit";
import {leaveType, leaveRequest} from "@/types";

interface LeaveState {
    leaveTypes: leaveType[];
    leaveRequests: leaveRequest[]; // Define a proper type for leave requests if available
}


const initialState: LeaveState = {
    leaveTypes: [],
    leaveRequests: []
}

const leaveSlice = createSlice({
    name: "leave",
    initialState,
    reducers: {
        getLeaveTypes: (state, action: PayloadAction<leaveType[]>) => {
            state.leaveTypes = action.payload;
        },
        getLeaveRequests: (state, action: PayloadAction<leaveRequest[]>) => {
            state.leaveRequests = action.payload;
        }
    }
});

export const {getLeaveTypes, getLeaveRequests} = leaveSlice.actions;

export default leaveSlice.reducer;