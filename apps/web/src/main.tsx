import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/familjen-grotesk/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght-italic.css";
import "./styles/index.css";

import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
