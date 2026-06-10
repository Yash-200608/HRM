import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { store } from "./redux-toolkit/store/store.ts";

createRoot(document.getElementById("root")!).render(

<HelmetProvider>
<Provider store={store}>    
<App />
</Provider>
</HelmetProvider>
);
