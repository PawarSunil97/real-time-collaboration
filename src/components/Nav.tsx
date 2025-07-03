import React, { useEffect, useState } from "react";
import {
  Navbar as BootstrapNavbar,
  Container,
  Nav,
  Button,
  OverlayTrigger,
  Tooltip
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

import { useNavigate, useParams } from "react-router-dom";
import { useBoardUsers } from "../hook/useBoardUsers";
import { NAVBAR } from "../appConstant";
import Avatar from "./Avatar";
import { BoardUser } from "../types/type";
import { onValue, ref } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import { FiShare2, FiLogOut } from "react-icons/fi";
interface NavbarProps {
  onLogout: () => void;
  onInvite: () => void;
  userPermission?: string;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout, onInvite,userPermission }) => {
  const { user, loading } = useAuth();
  

  const { boardId } = useParams<{ boardId: string }>();
  const users = useBoardUsers(boardId || "default");
  const onlineUsers = Object.values(users || {}).filter((u) => u.online);

  const [boardTitle, setBoardTitle] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    if (boardId) {
      const boardRef = ref(database, `boards/${boardId}`);
      const unsub = onValue(boardRef, (snap) => {
        const data = snap.val();
        setBoardTitle(data?.title || "");
      });
      return () => unsub();
    } else {
      setBoardTitle("");
    }
  }, [boardId]);

  const handleTitleClick = () => {
    const owner = localStorage.getItem("activeBoardOwner") || user?.uid;
    navigate(`/dashboard?owner=${owner}`);
  };

  return (
    <BootstrapNavbar
      bg="light"
      expand="lg"
      className="shadow-sm"
      style={{ position: "sticky", top: 0, zIndex: 1000 }}
    >
      <Container fluid>
        <BootstrapNavbar.Brand
          style={{ cursor: "pointer" }}
          className="fw-bold fs-4"
          onClick={handleTitleClick}
        >
          {boardId ? boardTitle : "Dashboard"}
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse
          id="basic-navbar-nav"
          className="justify-content-end"
        >
          <Nav className="align-items-center">
            {/* ✅ Online count and avatars on board */}
            {boardId && (
              <>
                <span className="d-flex align-items-center me-3">
                  <i className="bi bi-people-fill me-1"></i>
                  {onlineUsers.length} {NAVBAR.ONLINE_LABEL}
                </span>
                <div className="d-flex align-items-center me-3">
                  {onlineUsers.map((u: BoardUser) => (
                    <Avatar
                      key={u.uid}
                      user={u}
                      size={NAVBAR.AVATAR_SIZE}
                      onlineDotStyle={NAVBAR.ONLINE_DOT_STYLE}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ✅ Avatar and name on Dashboard */}
            {!boardId && !loading && user && (
              <div className="d-flex align-items-center me-3">
                <Avatar
                  user={{
                    uid: user.uid,
                    photoURL: user.photoURL || "",
                    displayName: user.displayName || "",
                    online: true,
                  }}
                  size={NAVBAR.AVATAR_SIZE}
                  onlineDotStyle={NAVBAR.ONLINE_DOT_STYLE}
                />
                <span className="ms-2">{user.displayName || user.email}</span>
              </div>
            )}

            {/* ✅ Share Board Button */}
           {boardId && userPermission !== "view" && userPermission !== "none" && (
  <OverlayTrigger
    placement="bottom"
    overlay={<Tooltip id="tooltip-share">Copy share link</Tooltip>}
  >
    <Button
      variant="primary"
      onClick={onInvite}
      className="d-flex align-items-center justify-content-center m-2"
    >
      <FiShare2 />
    </Button>
  </OverlayTrigger>
)}


            {/* ✅ Logout Button */}
             <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-logout">Logout</Tooltip>}
            >
              <Button variant="danger" onClick={onLogout} className="d-flex align-items-center justify-content-center m-2">
                <FiLogOut />
              </Button>
            </OverlayTrigger>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
