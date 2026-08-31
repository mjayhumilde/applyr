import { Outlet } from "react-router";
import { AppHeader } from "./components/AppHeader";

const App = () => {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className="mx-auto w-full max-w-4xl p-6 sm:p-10"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default App;
