import { BrowserRouter, Routes, Route } from "react-router-dom";

import SignInPage from "../features/auth/pages/SignInPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}