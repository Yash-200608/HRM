import {createSlice} from "@reduxjs/toolkit";
import { PayloadAction } from "@reduxjs/toolkit";
import {Admin, Employees} from "@/types";

interface UserState {
    admins: Admin[];
    employees: Employees[];
}
const initialState: UserState = {
    admins: [],
    employees : []
};


const userSlice = createSlice({
    name: "Users",
     initialState,
      reducers: {
         getAdminList:(state, action: PayloadAction<Admin[]>)=> {
                state.admins = action.payload;
         },
         getEmployeeList:(state, action: PayloadAction<Employees[]>)=> {
                state.employees = action.payload;
         }
      }});

export const {getAdminList, getEmployeeList} = userSlice.actions;
export default userSlice.reducer;