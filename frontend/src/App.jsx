import React from "react";
import AppRouter from "./routes/router";
import "./App.css";
import { useContext } from "react";
import { LoaderContext } from "./context/LoaderContext";
import GlobalLoader from "./components/ui/GlobalLoader";

export default function App() {
  const { loading } = useContext(LoaderContext);

  return (
    <>
      {loading && <GlobalLoader />}
      <AppRouter />
    </>
  );
}
