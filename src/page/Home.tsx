import React, { useEffect, useState } from "react";
import Navbar from "../components/Nav";
import Sidebar from "../components/Board/Sidebar";
import Canvas from "../components/Board/Canvas";
import { BoardProvider } from "../context/BoardContext";
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePresence } from "../hook/usePresence";
import { signOut } from "firebase/auth";
import { auth, database } from "../firebase/firebaseConfig";
import InviteModal from "../components/InviteModal";
import { get, ref } from "firebase/database";

const Home: React.FC = () => {
  const { user, loading } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const resolvedBoardId = boardId || user?.uid || "";

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userPermission, setUserPermission] = useState<
    "owner" | "edit" | "view" | "none"
  >("none");
  const [permissionLoading, setPermissionLoading] = useState(true);

  usePresence(resolvedBoardId);

  const handleLogout = () => signOut(auth);
  const handleInvite = () => setShowInviteModal(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !boardId) {
        setPermissionLoading(false);
        return;
      }

      try {
        const ownerSnap = await get(ref(database, `boards/${boardId}/owner`));
        if (ownerSnap.exists() && ownerSnap.val() === user.uid) {
          setUserPermission("owner");
        } else {
          const sharedSnap = await get(
            ref(database, `boards/${boardId}/sharedWith/${user.uid}/permission`)
          );
          if (sharedSnap.exists()) {
            const perm = sharedSnap.val();
            setUserPermission(perm === "edit" ? "edit" : "view");
          } else {
            setUserPermission("none");
          }
        }
      } catch (err) {
        console.error("Error checking permission:", err);
        setUserPermission("none");
      } finally {
        setPermissionLoading(false);
      }
    };

    checkPermission();
  }, [user, boardId]);
  useEffect(() => {
    if (!boardId) return;

    const recent = JSON.parse(localStorage.getItem("recentBoards") || "[]");
    const updated = [
      boardId,
      ...recent.filter((id: string) => id !== boardId),
    ].slice(0, 10);
    localStorage.setItem("recentBoards", JSON.stringify(updated));
  }, [boardId]);

  if (loading || permissionLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!boardId) return <Navigate to={`/board/${user.uid}`} />;

  if (userPermission === "none") {
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        Access Denied: You do not have permission to view this board.
      </div>
    );
  }

  return (
    <BoardProvider boardId={resolvedBoardId} userPermission={userPermission}>
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Navbar
          onLogout={handleLogout}
          onInvite={handleInvite}
          userPermission={userPermission}
        />

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              width: "80px",
              background: "#f8f9fa",
              borderRight: "1px solid #ddd",
            }}
          >
            <Sidebar />
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <Canvas boardId={resolvedBoardId} />
          </div>
        </div>

        <InviteModal
          show={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          boardId={resolvedBoardId}
        />
      </div>
    </BoardProvider>
  );
};

export default Home;
