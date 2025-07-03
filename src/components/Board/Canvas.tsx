// Updated Canvas.tsx with improved touch support for text input
import React, { useState, useEffect, useRef } from "react";
import Note from "./Note";
import Shape from "./Shape";
import { useAuth } from "../../context/AuthContext";
import { useBoard } from "../../context/BoardContext";
import SimpleText from "./SimpleText";

interface CanvasProps {
  boardId: string;
}

const Canvas: React.FC<CanvasProps> = ({ boardId }) => {
  const { user } = useAuth();
  const {
    activeTool,
    setActiveTool,
    selectedColor,
    notes,
    shapes,
    userNames,
    createNote,
    createShape,
    createSimpleText,
    simpleTexts,
    cursors,
    trackCursor,
    updateNote,
    updateShape,
    updateSimpleText,
    deleteNote,
    deleteShape,
    deleteSimpleText,
     userPermission,
  } = useBoard();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
const isReadOnly = userPermission === "view" || userPermission === "none";
  const getTouchOrMouseCoords = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } => {
    const container = scrollContainerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const scrollX = container.scrollLeft;
    const scrollY = container.scrollTop;

    const x = (clientX - rect.left + scrollX) / scale;
    const y = (clientY - rect.top + scrollY) / scale;

    return { x, y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getTouchOrMouseCoords(e.clientX, e.clientY);
      trackCursor(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const { x, y } = getTouchOrMouseCoords(touch.clientX, touch.clientY);
      trackCursor(x, y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [trackCursor, scale]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.min(Math.max(prev + delta, 0.1), 4));
    }
  };

  // Check if the target is an interactive element
  const isInteractiveElement = (target: HTMLElement): boolean => {
    const interactiveTags = ["TEXTAREA", "INPUT", "BUTTON", "SELECT"];
    const interactiveRoles = ["button", "textbox", "combobox"];

    return (
      interactiveTags.includes(target.tagName.toUpperCase()) ||
      interactiveRoles.includes(target.getAttribute("role") || "") ||
      target.isContentEditable ||
      target.closest("textarea, input, button, select") !== null
    );
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    const target = e.target as HTMLElement;

    // Don't create new elements if clicking on interactive elements
    if (isInteractiveElement(target)) {
      return;
    }

    setSelectedId(null);
    if (!activeTool || !user || !boardId) return;

    const { x, y } = getTouchOrMouseCoords(e.clientX, e.clientY);

    setActiveTool(null);
    try {
      if (activeTool === "note") {
        await createNote(x, y);
      } else if (
        activeTool === "rectangle" ||
        activeTool === "circle" ||
        activeTool === "line"
      ) {
        await createShape(activeTool, x, y);
      } else if (activeTool === "simpleText") {
        await createSimpleText(x, y);
      }
    } catch (error) {
      console.error("Error creating element:", error);
    }
  };

  const handleCanvasTouch = async (e: React.TouchEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    const target = e.target as HTMLElement;

    // Don't create new elements if touching interactive elements
    if (isInteractiveElement(target)) {
      return;
    }

    // Only handle single touch for creating elements
    if (e.touches.length !== 1) return;

    setSelectedId(null);
    if (!activeTool || !user || !boardId) return;

    const touch = e.touches[0];
    const { x, y } = getTouchOrMouseCoords(touch.clientX, touch.clientY);

    setActiveTool(null);
    try {
      if (activeTool === "note") {
        await createNote(x, y);
      } else if (
        activeTool === "rectangle" ||
        activeTool === "circle" ||
        activeTool === "line"
      ) {
        await createShape(activeTool, x, y);
      } else if (activeTool === "simpleText") {
        await createSimpleText(x, y);
      }
    } catch (error) {
      console.error("Error creating element:", error);
    }
  };

  const handleNoteUpdate = async (id: string, updates: Partial<any>) => {
    try {
      await updateNote(id, updates);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };
  const handleSimpleTextUpdate = async (id: string, updates: Partial<any>) => {
    try {
      await updateSimpleText(id, updates);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };
  const handleShapeUpdate = async (id: string, updates: Partial<any>) => {
    try {
      await updateShape(id, updates);
    } catch (error) {
      console.error("Error updating shape:", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      setSelectedId(null);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };
  const handleDeleteSimpleText = async (id: string) => {
    try {
      await deleteSimpleText(id);
      setSelectedId(null);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };
  const handleDeleteShape = async (id: string) => {
    try {
      await deleteShape(id);
      setSelectedId(null);
    } catch (error) {
      console.error("Error deleting shape:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete when typing in text inputs
      if (isReadOnly) return;
      if (e.target && isInteractiveElement(e.target as HTMLElement)) {
        return;
      }

      if (e.key === "Backspace" && selectedId) {
        if (isReadOnly) return;
        e.preventDefault();

        const noteExists = notes.find((n) => n.id === selectedId);
        const shapeExists = shapes.find((s) => s.id === selectedId);
        const simpleText = simpleTexts.find((s) => s.id === selectedId);
        if (noteExists) {
          deleteNote(selectedId);
          setSelectedId(null);
        } else if (shapeExists) {
          deleteShape(selectedId);
          setSelectedId(null);
        } else if (simpleText) {
          deleteSimpleText(selectedId);
          setSelectedId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedId,
    notes,
    shapes,
    simpleTexts,
    deleteNote,
    deleteShape,
    deleteSimpleText,
  ]);

  return (
    <div
      ref={scrollContainerRef}
      onClick={handleCanvasClick}
      onTouchStart={handleCanvasTouch}
      onWheel={handleWheel}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "#f5f5f5",
        position: "relative",
        cursor: "grab",
        touchAction: "pan-x pan-y pinch-zoom", 
        pointerEvents: isReadOnly ? "none" : "auto",
      }}
    >
      <div
        style={{
          width: 3000,
          height: 3000,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          backgroundImage:
            "linear-gradient(0deg, #e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          position: "relative",
        }}
      >
        {notes.map((note) => (
          <Note
            key={note.id}
            {...note}
            scale={scale}
            currentUser={user?.uid || ""}
            selected={selectedId === note.id}
            userNames={userNames}
            onSelect={(id) => setSelectedId(id)}
            onDragStop={(id, x, y) => handleNoteUpdate(id, { x, y })}
            onResize={(id, w, h) =>
              handleNoteUpdate(id, { width: w, height: h })
            }
            onDelete={handleDeleteNote}
            onTextChange={(id, text) => handleNoteUpdate(id, { text })}
          />
        ))}

        {shapes.map((shape) => (
          <Shape
            key={shape.id}
            {...shape}
            scale={scale}
            currentUser={user?.uid || ""}
            selected={selectedId === shape.id}
            onSelect={(id) => setSelectedId(id)}
            onMove={(id, x, y) => handleShapeUpdate(id, { x, y })}
            onResize={(id, w, h) =>
              handleShapeUpdate(id, { width: w, height: h })
            }
            onDelete={handleDeleteShape}
            onTextUpdate={(id, text) => handleShapeUpdate(id, { text })}
          />
        ))}
        {simpleTexts.map((text) => (
          <SimpleText
            key={text.id}
            {...text}
            scale={scale}
            selected={selectedId === text.id}
            onSelect={(id) => setSelectedId(id)}
            onDelete={(id) => handleDeleteSimpleText(id)}
            onTextChange={(id, newText) =>
              handleSimpleTextUpdate(id, { text: newText })
            }
            onResize={(id, w, h) =>
              handleSimpleTextUpdate(id, { width: w, height: h })
            }
            onDragStop={(id, x, y) => handleSimpleTextUpdate(id, { x, y })}
            onRotate={(id, rotation) =>
              handleSimpleTextUpdate(id, { rotation })
            }
          />
        ))}

        {Object.entries(cursors).map(([uid, cursorData]) => {
          if (uid === user?.uid) return null;

          return (
            <div
              key={uid}
              style={{
                position: "absolute",
                left: cursorData.x * scale,
                top: cursorData.y * scale,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: cursorData.color || "#007bff",
                  borderRadius: "50%",
                  border: "2px solid white",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: "#333",
                  background: "#fff",
                  padding: "2px 4px",
                  borderRadius: 4,
                  marginTop: 2,
                  textAlign: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }}
              >
                {cursorData.displayName || "User"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Canvas;
