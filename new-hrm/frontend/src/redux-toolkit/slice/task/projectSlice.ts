import {createSlice, PayloadAction} from "@reduxjs/toolkit";


const initialState = {
    projects: []
}


const projectSlice = createSlice({
    name: "project",
    initialState,
    reducers: {
        getProjects: (state, action: PayloadAction<any[]>) => {
            state.projects = action.payload;
        },

       setDeleteProject: (state, action) => {
    const projectId = action.payload;

    state.projects = state.projects.filter(
        (project) => project._id !== projectId
    );
}
    }
});


export const { getProjects, setDeleteProject } = projectSlice.actions;
export default projectSlice.reducer;