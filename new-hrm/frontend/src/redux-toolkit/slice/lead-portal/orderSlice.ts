import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    orderList: []
}

const orderSlice = createSlice({
    name: "orders",
    initialState,
    reducers: {
        getOrderList: (state, action: PayloadAction<any[]>) => {
            state.orderList = action.payload;
        },
    },
})

export const { getOrderList } = orderSlice.actions;
export default orderSlice.reducer;
