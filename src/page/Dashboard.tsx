import React, { useState, useEffect } from "react";
import { Button, Row, Col } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, database } from "../firebase/firebaseConfig";
import { ref, onValue, push, set, remove, get } from "firebase/database";
import CreateBoardModal from "./CreateBoardModal";
import BoardsTable from "./BoardsTable";
import Navbar from "../components/Nav";
import SidebarMenu from "./SidebarMenu"; // Dashboard sidebar
import { signOut } from "firebase/auth";

interface Board {
  boardId: string;
  title: string;
  createdAt: number;
  invitedFrom?: string;
  ownerName: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [onlineCounts, setOnlineCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
 const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryOwner = searchParams.get("owner");
  const view = searchParams.get("view"); // <- NEW: 'shared' or null
  const localOwner = localStorage.getItem("activeBoardOwner");
  const ownerUid = queryOwner || localOwner || user?.uid;
  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  useEffect(() => {
    if (ownerUid) {
      localStorage.setItem("activeBoardOwner", ownerUid);
    }
  }, [ownerUid]);

  useEffect(() => {
    if (!user) return;
    const boardsRef = ref(database, `boards`);

    return onValue(boardsRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const recentIds: string[] = JSON.parse(
        localStorage.getItem("recentBoards") || "[]"
      );
      const fetchedBoards = await Promise.all(
        Object.entries(data).map(async ([boardId, boardData]: any) => {
          const isOwner = boardData.owner === user.uid;
          const isSharedWithUser = boardData.sharedWith?.[user.uid];

          // ✅ Apply shared board filtering
          // if (view === "shared" && (!isSharedWithUser || isOwner)) return null;
          // if (view !== "shared" && !isOwner && !isSharedWithUser) return null;
          if (view === "recent") {
            if (!recentIds.includes(boardId)) return null;
          } else if (view === "shared") {
            if (!isSharedWithUser || isOwner) return null;
          } else {
            if (!isOwner && !isSharedWithUser) return null;
          }
          let ownerName = "Unknown";
          if (boardData.owner) {
            const ownerSnap = await get(
              ref(database, `users/${boardData.owner}`)
            );
            if (ownerSnap.exists()) {
              const userData = ownerSnap.val();
              ownerName = userData.name;
            }
          }

          return {
            boardId,
            title: boardData.title || "Untitled",
            createdAt: boardData.createdAt || 0,
            invitedFrom: isOwner ? undefined : boardData.owner,
            ownerName,
          } as Board;
        })
      );

      const filteredBoards = fetchedBoards.filter(
        (b): b is Board => b !== null
      );
      if (view === "recent") {
        const sortedBoards = recentIds
          .map((id) => filteredBoards.find((b) => b.boardId === id))
          .filter((b): b is Board => !!b);
        setBoards(sortedBoards);
      } else {
        setBoards(filteredBoards);
      }
    });
  }, [user, view]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    boards.forEach((board) => {
      const usersRef = ref(database, `boards/${board.boardId}/users`);
      const unsub = onValue(usersRef, (snap) => {
        const data = snap.val() || {};
        const online = Object.values(data).filter((u: any) => u.online).length;
        setOnlineCounts((prev) => ({ ...prev, [board.boardId]: online }));
      });

      unsubscribes.push(() => unsub());
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [boards]);

  const handleCreateBoard = async (title: string) => {
    if (!user) return;

    const newBoardRef = push(ref(database, "boards"));
    const boardId = newBoardRef.key as string;

    const newBoardData = {
      createdAt: Date.now(),
      title,
      owner: user.uid,
    };

    await set(newBoardRef, newBoardData);
    await set(ref(database, `userBoards/${user.uid}/${boardId}`), true);

    navigate(`/board/${boardId}`);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!user) return;
    await remove(ref(database, `boards/${boardId}`));
    await remove(ref(database, `userBoards/${user.uid}/${boardId}`));
  };

  const handleLogout = () => signOut(auth);
   useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  return (
    <>
      <Navbar onLogout={handleLogout} onInvite={() => {}} />

     {isMobile && (
        <button
          className="btn btn-outline-secondary d-md-none"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          style={{
            position: "fixed",
            top: "4rem",
            left: "1rem",
            zIndex: 1051,
          }}
        >
          ☰
        </button>
      )}

      {/* Optional backdrop */}
      {isMobile && showSidebar && (
        <div
          className="d-md-none"
          onClick={() => setShowSidebar(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 1050,
          }}
        ></div>
      )}

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div
          style={{
            width: showSidebar ? "200px" : "0px",
            background: "#f8f9fa",
            height: "100vh",
            borderRight: "1px solid #ddd",
            overflow: "hidden",
            transition: "width 0.3s ease",
            position: "fixed",
            zIndex: 1052,
          }}
          className="d-md-block"
        >
          <SidebarMenu />
        </div>

        {/* Main content */}
        <div
          className="container py-4"
          style={{
            marginLeft: !isMobile && showSidebar ? "200px" : "0px",
            transition: "margin-left 0.3s ease",
          }}
        >
          <Row className="justify-content-center mb-3 mt-3">
            <Col>
              <h4 className="mb-0">
                {view === "shared"
                  ? "Shared Boards"
                  : view === "recent"
                  ? "Recent Boards"
                  : "My Boards"}
              </h4>
            </Col>
            <Col className="text-end">
              <Button variant="primary" onClick={() => setShowModal(true)}>
                + Create new
              </Button>
            </Col>
          </Row>

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            <BoardsTable
              boards={boards}
              onlineCounts={onlineCounts}
              onRowClick={(boardId) => navigate(`/board/${boardId}`)}
              onDelete={handleDeleteBoard}
              user={user}
            />
          </div>

          <CreateBoardModal
            show={showModal}
            onHide={() => setShowModal(false)}
            onCreate={(title) => {
              handleCreateBoard(title);
              setShowModal(false);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
