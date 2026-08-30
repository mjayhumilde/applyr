import { createBrowserRouter } from "react-router";
import App from "./App";
import ApplicationsPage from "../features/applications/pages/ApplicationsPage";
import NewApplicationPage from "../features/applications/pages/NewApplicationPage";
import ApplicationDetailsPage from "../features/applications/pages/ApplicationDetailsPage";
import EditApplicationPage from "../features/applications/pages/EditApplicationPage";
import NotFoundPage from "./NotFoundPage";
import Dashboard from "../features/dashboard/pages/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: Dashboard },
      {
        path: "applications",
        children: [
          {
            index: true,
            Component: ApplicationsPage,
          },
          {
            path: "new",
            Component: NewApplicationPage,
          },
          {
            path: ":applicationId/edit",
            Component: EditApplicationPage,
          },
          {
            path: ":applicationId",
            Component: ApplicationDetailsPage,
          },
        ],
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);
