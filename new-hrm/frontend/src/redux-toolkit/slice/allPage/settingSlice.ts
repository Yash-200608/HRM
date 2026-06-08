import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Setting } from "@/types";

export interface SettingState {
  setting: Setting | null;
  companyDetail: string | any | null;
}

const initialState: SettingState = {
  setting: null,
  companyDetail:null
};

const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {
    getSetting: (state, action: PayloadAction<Setting>) => {
      state.setting = action.payload;
    },
    getCompanyDetail:(state,action:PayloadAction<any>) => {
    state.companyDetail = action.payload
    },
    clearSetting: (state) => {
      state.setting = null;
    }
  },
});

export const { getSetting, clearSetting, getCompanyDetail } = settingSlice.actions;
export default settingSlice.reducer;
