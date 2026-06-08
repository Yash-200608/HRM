import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    productList: []
}

const productSlice = createSlice({
    name: "product",
    initialState,
    reducers: {
        getProductList: (state, action: PayloadAction<any[]>) => {
            state.productList = action.payload;
        },
    },
})

export const { getProductList } = productSlice.actions;
export default productSlice.reducer;
