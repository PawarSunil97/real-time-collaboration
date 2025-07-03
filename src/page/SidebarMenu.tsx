import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaUserFriends, FaClock } from "react-icons/fa";
import "../assets/SidebarMenu.css"; // Optional: for active styling

const SidebarMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentView = new URLSearchParams(location.search).get("view");

  return (
    <div
      style={{
        width: "200px",
        background: "#f8f9fa",
        padding: "1rem",
        height: "100vh",
        borderRight: "1px solid #ddd",
      }}
    >
      {/* Home */}
      <div
        className={`sidebar-item ${!currentView ? "active" : ""}`}
        onClick={() => navigate("/dashboard")}
        style={{
          cursor: "pointer",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <FaHome />
        <span>Home</span>
      </div>

      {/* Shared */}
      <div
        className={`sidebar-item ${currentView === "shared" ? "active" : ""}`}
        onClick={() => navigate("/dashboard?view=shared")}
        style={{
          cursor: "pointer",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <FaUserFriends />
        <span>Shared</span>
      </div>

      {/* Recent (future support) */}
      <div
        className={`sidebar-item ${currentView === "recent" ? "active" : ""}`}
        onClick={() => navigate("/dashboard?view=recent")}
        style={{
          cursor: "pointer",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <FaClock />
        <span>Recent</span>
      </div>
    </div>
  );
};

export default SidebarMenu;
