import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MeetingNotification from "./MeetingNotification";

// Determine which component to render based on the URL path
const path = window.location.pathname;
const Component = path === '/notification' ? MeetingNotification : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>,
);
