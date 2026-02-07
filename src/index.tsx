import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MobileDataGateway } from "./wrappers/MobileDataGateway";

const root = createRoot(document.querySelector("main")!);
root.render(
  <StrictMode>
    <MobileDataGateway>
      <App />
    </MobileDataGateway>
  </StrictMode>
);
