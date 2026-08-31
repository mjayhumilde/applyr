import { Outlet } from "react-router";
import { AppHeader } from "./components/AppHeader";

const App = () => {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
