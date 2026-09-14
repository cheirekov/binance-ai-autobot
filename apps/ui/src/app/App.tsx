import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TraderV2Page } from "../pages/TraderV2Page";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes><Route path="*" element={<TraderV2Page />} /></Routes>
    </BrowserRouter>
  );
}
