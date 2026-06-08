import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import{Attendances} from "@/types";

interface AttendanceState {
    attendance: Attendances[];
    attendanceReport : any[];
}

const initialState: AttendanceState = {
    attendance: [],
    attendanceReport: []
};

const attendanceSlice = createSlice({
    name: "attendance",
    initialState,
    reducers: {
        getAttendance : (state, action: PayloadAction<Attendances[]>) => {
            state.attendance = action.payload;
        },
        getAttendanceReport : (state, action: PayloadAction<any[]>) => {
            state.attendanceReport = action.payload;
        }
    }
})

export const {getAttendance, getAttendanceReport} = attendanceSlice.actions;
export default attendanceSlice.reducer;