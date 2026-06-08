import {createSlice, PayloadAction} from "@reduxjs/toolkit";



const initialState = {
    expenses: [],
    expenseCategory: [] 
}


const expenseSlice = createSlice({
    name: "expense",
    initialState,
    reducers: {
        getExpense: (state, action: PayloadAction<any[]>) => {
            state.expenses = action.payload;
        },
            getExpenseCategory: (state, action: PayloadAction<any[]>) => {
            state.expenseCategory = action.payload;
        }
    }
});

export const {getExpense, getExpenseCategory} = expenseSlice.actions;

export default expenseSlice.reducer;