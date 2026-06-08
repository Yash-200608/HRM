import{createSlice, PayloadAction} from "@reduxjs/toolkit";
import { User, UserRole } from '@/types';

interface login {
    loginUser: User | null;
}

const initialState: login = {
    loginUser: null,
}

const loginUserSlice = createSlice({
    name: "LoginUser",
    initialState,
    reducers: {
        getLoginUser: (state, action: PayloadAction<any>) => {
            state.loginUser = action.payload;
        },
    }
});

export const {getLoginUser} = loginUserSlice.actions;

export default loginUserSlice.reducer;