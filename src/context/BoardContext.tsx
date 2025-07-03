import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { ref, onValue, set, update, remove, get, off } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import { v4 as uuid } from "uuid";

export type ToolType =
  | "note"
  | "rectangle"
  | "circle"
  | "line"
  | "simpleText"
  | null;

export type NoteType = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy: string;
  color: string;
};

export type ShapeType = {
  id: string;
  type: "rectangle" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  text: string;
  createdBy: string;
};
export type SimpleTextType = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  createdBy: string;
};
// Individual operation types for undo/redo
type Operation =
  | { type: "CREATE_NOTE"; data: NoteType }
  | { type: "CREATE_SHAPE"; data: ShapeType }
  | { type: "CREATE_SIMPLE_TEXT"; data: SimpleTextType }
  | {
      type: "UPDATE_NOTE";
      id: string;
      oldData: Partial<NoteType>;
      newData: Partial<NoteType>;
    }
  | {
      type: "UPDATE_SHAPE";
      id: string;
      oldData: Partial<ShapeType>;
      newData: Partial<ShapeType>;
    }
  | {
      type: "UPDATE_SIMPLE_TEXT";
      id: string;
      oldData: Partial<SimpleTextType>;
      newData: Partial<SimpleTextType>;
    }
  | { type: "DELETE_NOTE"; data: NoteType }
  | { type: "DELETE_SHAPE"; data: ShapeType }
  | { type: "DELETE_SIMPLE_TEXT"; data: SimpleTextType };

interface BoardContextType {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  setActiveToolInternal: (tool: ToolType) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  cursors: Record<string, any>;
  trackCursor: (x: number, y: number) => void;
  notes: NoteType[];
  shapes: ShapeType[];
  simpleTexts: SimpleTextType[];
  userPermission: "owner" | "edit" | "view" | "none";
  // Optional: expose read-only helper
  isReadOnly: boolean;
  // User names mapping
  userNames: Record<string, string>;

  // CRUD operations
  createNote: (x: number, y: number) => Promise<void>;
  createShape: (type: ShapeType["type"], x: number, y: number) => Promise<void>;
  createSimpleText: (x: number, y: number) => Promise<void>;
  updateNote: (id: string, updates: Partial<NoteType>) => Promise<void>;
  updateShape: (id: string, updates: Partial<ShapeType>) => Promise<void>;
  updateSimpleText: (
    id: string,
    updates: Partial<SimpleTextType>
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteShape: (id: string) => Promise<void>;
  deleteSimpleText: (id: string) => Promise<void>;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
type CursorData = {
  x: number;
  y: number;
  displayName: string;
  color: string;
  lastActive: number;
};
interface BoardProviderProps {
  children: React.ReactNode;
  boardId: string;
  userPermission: "owner" | "edit" | "view" | "none";
}
const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<BoardProviderProps> = ({
  children,
  boardId,
  userPermission,
}) => {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#FFEB3B");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );

  const [notes, setNotes] = useState<NoteType[]>([]);
  const [shapes, setShapes] = useState<ShapeType[]>([]);
  const [simpleTexts, setSimpleTexts] = useState<SimpleTextType[]>([]);

  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Individual operation stacks for undo/redo
  const [undoStack, setUndoStack] = useState<Operation[]>([]);
  const [redoStack, setRedoStack] = useState<Operation[]>([]);
  const [cursors, setCursors] = useState<{ [uid: string]: CursorData }>({});

  // Track if we're in the middle of an undo/redo operation
  const isUndoRedoOperation = useRef(false);
  const isReadOnly = userPermission === "view";

  // Function to fetch user names
  const fetchUserNames = useCallback(
    async (boardId: string, userIds: string[]) => {
      const idsToFetch = userIds.filter((id) => id && !userNames[id]);
      if (idsToFetch.length === 0) return;

      try {
        const fetchPromises = idsToFetch.map(async (userId) => {
          try {
            const userSnapshot = await get(
              ref(database, `boards/${boardId}/users/${userId}`)
            );
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              return {
                id: userId,
                name:
                  userData.displayName ||
                  userId.split("@")[0] ||
                  "Unknown User",
              };
            }

            return {
              id: userId,
              name: userId.includes("@")
                ? userId.split("@")[0]
                : "Unknown User",
            };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return {
              id: userId,
              name: userId.includes("@")
                ? userId.split("@")[0]
                : "Unknown User",
            };
          }
        });

        const results = await Promise.all(fetchPromises);

        setUserNames((prev) => {
          const updated = { ...prev };
          results.forEach(({ id, name }) => {
            updated[id] = name;
          });
          return updated;
        });

        console.log("Fetched Usernames:", results);
      } catch (error) {
        console.error("Error fetching user names:", error);
      }
    },
    [userNames]
  );

  // firebase liestner
  useEffect(() => {
    if (!boardId) return;

    const cursorsRef = ref(database, `boards/${boardId}/cursors`);
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      const raw = snapshot.val() || {};
      const now = Date.now();

      const filtered: { [uid: string]: CursorData } = {};
      Object.entries(raw).forEach(([uid, data]) => {
        // Type guard: check that data is an object and has expected fields
        if (
          typeof data === "object" &&
          data !== null &&
          "x" in data &&
          "y" in data &&
          "lastActive" in data &&
          typeof (data as any).lastActive === "number"
        ) {
          const cursor = data as CursorData;

          // Only include if active in last 30 seconds
          if (now - cursor.lastActive < 30000) {
            filtered[uid] = cursor;
          }
        }
      });

      setCursors(filtered);
    });

    return () => off(cursorsRef, "value", unsubscribe);
  }, [boardId]);

  const trackCursor = (x: number, y: number) => {
    if (!user || !boardId) return;

    const cursorRef = ref(database, `boards/${boardId}/cursors/${user.uid}`);
    set(cursorRef, {
      x,
      y,
      displayName: user.displayName || user.email || "User",
      color: "#007bff",
      lastActive: Date.now(),
    });
  };

  // Firebase listeners
  useEffect(() => {
    if (!boardId) return;

    const notesRef = ref(database, `boards/${boardId}/notes`);
    const shapesRef = ref(database, `boards/${boardId}/shapes`);
    const simpleTextRef = ref(database, `boards/${boardId}/simpleTexts`);

    const unsubNotes = onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val();
        const loaded: NoteType[] = data
          ? Object.entries(data).map(([key, val]: [string, any]) => ({
              id: key,
              text: val.text || "",
              x: val.x || 0,
              y: val.y || 0,
              width: val.width || 200,
              height: val.height || 100,
              createdBy: val.createdBy || "",
              color: val.color || "#FFEB3B",
            }))
          : [];
        setNotes(loaded);

        // Fetch user names for note creators
        const creatorIds = loaded.map((note) => note.createdBy).filter(Boolean);
        if (creatorIds.length > 0) {
          fetchUserNames(boardId, creatorIds);
        }
      },
      (error) => {
        console.error("Error loading notes:", error);
      }
    );

    const unsubShapes = onValue(
      shapesRef,
      (snapshot) => {
        const data = snapshot.val();
        const loaded: ShapeType[] = data
          ? Object.entries(data).map(([key, val]: [string, any]) => ({
              id: key,
              type: val.type || "rectangle",
              x: val.x || 0,
              y: val.y || 0,
              width: val.width || 100,
              height: val.height || 100,
              color: val.color || "#2196F3",
              rotation: val.rotation ?? 0,
              text: val.text ?? "",
              createdBy: val.createdBy || "",
            }))
          : [];
        setShapes(loaded);

        // Fetch user names for shape creators
        const creatorIds = loaded
          .map((shape) => shape.createdBy)
          .filter(Boolean);
        if (creatorIds.length > 0) {
          fetchUserNames(boardId, creatorIds);
        }
      },
      (error) => {
        console.error("Error loading shapes:", error);
      }
    );
    const unsubSimpleText = onValue(
      simpleTextRef,
      (snapshot) => {
        const data = snapshot.val();
        const loaded: SimpleTextType[] = data
          ? Object.entries(data).map(([key, val]: [string, any]) => ({
              id: key,
              text: val.text || "",
              x: val.x || 0,
              y: val.y || 0,
              width: val.width || 200,
              height: val.height || 50,
              rotation: val.rotation || 0,
              createdBy: val.createdBy || "",
              color: val.color || "#000",
            }))
          : [];
        setSimpleTexts(loaded);
      },
      (error) => {
        console.error("Error loading simpleTexts:", error);
      }
    );
    return () => {
      unsubNotes();
      unsubShapes();
      unsubSimpleText();
    };
  }, [boardId, fetchUserNames]);

  // Helper to add operation to undo stack
  const addToUndoStack = useCallback((operation: Operation) => {
    if (isUndoRedoOperation.current) return;

    setUndoStack((prev) => {
      const newStack = [...prev, operation];
      // Limit stack size
      if (newStack.length > 50) {
        newStack.shift();
      }
      return newStack;
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, []);

  // CRUD Operations with undo tracking
  const createNote = useCallback(
    async (x: number, y: number) => {
      if (isReadOnly || !user || !boardId) return;

      const id = uuid();
      const newNote: NoteType = {
        id,
        text: "",
        x,
        y,
        width: 200,
        height: 100,
        color: selectedColor,
        createdBy: user.uid,
      };

      try {
        const { id: noteId, ...noteData } = newNote;
        await set(ref(database, `boards/${boardId}/notes/${id}`), noteData);

        // Add to undo stack
        addToUndoStack({ type: "CREATE_NOTE", data: newNote });
        setRedoStack([]);
      } catch (error) {
        console.error("Error creating note:", error);
      }
    },
    [isReadOnly, user, boardId, selectedColor, addToUndoStack]
  );

  const createShape = useCallback(
    async (type: ShapeType["type"], x: number, y: number) => {
      if (isReadOnly || !user || !boardId) return;

      const id = uuid();
      const newShape: ShapeType = {
        id,
        type,
        x,
        y,
        width: 100,
        height: 100,
        color: selectedColor,
        rotation: 0,
        text: "",
        createdBy: user.uid,
      };

      try {
        const { id: shapeId, ...shapeData } = newShape;
        await set(ref(database, `boards/${boardId}/shapes/${id}`), shapeData);

        // Add to undo stack
        addToUndoStack({ type: "CREATE_SHAPE", data: newShape });
        setRedoStack([]);
      } catch (error) {
        console.error("Error creating shape:", error);
      }
    },
    [isReadOnly, user, boardId, selectedColor, addToUndoStack]
  );
  const createSimpleText = useCallback(
    async (x: number, y: number) => {
      const defaultColor = "#000000";
      if (isReadOnly || !user || !boardId) return;

      const id = uuid();
      const newText: SimpleTextType = {
        id,
        text: "",
        x,
        y,
        width: 200,
        height: 50,
        color: selectedColor || defaultColor,
        rotation: 0,
        createdBy: user.uid, // ✅ required for Firebase rules
      };

      try {
        await update(
          ref(database, `boards/${boardId}/simpleTexts/${id}`),
          newText // ✅ send full object
        );

        addToUndoStack({ type: "CREATE_SIMPLE_TEXT", data: newText });
        setRedoStack([]);
      } catch (error) {
        console.error("Error creating simpleText:", error);
      }
    },
    [isReadOnly, user, boardId, selectedColor, addToUndoStack]
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<NoteType>) => {
      if (isReadOnly || !user || !boardId) return;

      // Get current note data for undo
      const currentNote = notes.find((n) => n.id === id);
      if (!currentNote) return;

      // Create old data object with only the fields being updated
      const oldData: Partial<NoteType> = {};
      Object.keys(updates).forEach((key) => {
        const typedKey = key as keyof NoteType;
        (oldData as any)[typedKey] = currentNote[typedKey];
      });

      try {
        await update(ref(database, `boards/${boardId}/notes/${id}`), updates);

        // Add to undo stack
        setUndoStack((prev) => [
          ...prev,
          {
            type: "UPDATE_NOTE",
            id,
            oldData,
            newData: updates,
          },
        ]);

        setRedoStack([]);
      } catch (error) {
        console.error("Error updating note:", error);
      }
    },
    [isReadOnly, boardId, notes, addToUndoStack]
  );

  const updateShape = useCallback(
    async (id: string, updates: Partial<ShapeType>) => {
      if (isReadOnly || !user || !boardId) return;
      // Get current shape data for undo
      const currentShape = shapes.find((s) => s.id === id);
      if (!currentShape) return;

      // Create old data object with only the fields being updated
      const oldData: Partial<ShapeType> = {};
      Object.keys(updates).forEach((key) => {
        const typedKey = key as keyof ShapeType;
        (oldData as any)[typedKey] = currentShape[typedKey];
      });

      try {
        await update(ref(database, `boards/${boardId}/shapes/${id}`), updates);

        // Add to undo stack
        setUndoStack((prev) => [
          ...prev,
          {
            type: "UPDATE_SHAPE",
            id,
            oldData,
            newData: updates,
          },
        ]);

        setRedoStack([]); // ✅ Clear redo stack
      } catch (error) {
        console.error("Error updating shape:", error);
      }
    },
    [isReadOnly, boardId, shapes, addToUndoStack]
  );
  const updateSimpleText = useCallback(
    async (id: string, updates: Partial<SimpleTextType>) => {
      if (isReadOnly || !user || !boardId) return;
      // Get current note data for undo
      const currentText = simpleTexts.find((n) => n.id === id);
      if (!currentText) return;
      const oldData: Partial<SimpleTextType> = {};
      Object.keys(updates).forEach((key) => {
        const typedKey = key as keyof SimpleTextType;
        (oldData as any)[typedKey] = currentText[typedKey];
      });
      try {
        await update(
          ref(database, `boards/${boardId}/simpleTexts/${id}`),
          updates
        );

        setUndoStack((prev) => [
          ...prev,
          {
            type: "UPDATE_SIMPLE_TEXT",
            id,
            oldData,
            newData: updates,
          },
        ]);

        setRedoStack([]);
      } catch (error) {
        console.error("Error updating simpleText:", error);
      }
    },
    [isReadOnly, boardId, simpleTexts, addToUndoStack]
  );
  const deleteNote = useCallback(
    async (id: string) => {
      if (isReadOnly || !user || !boardId) return;

      // Get note data for undo
      const noteToDelete = notes.find((n) => n.id === id);
      if (!noteToDelete) return;

      try {
        await remove(ref(database, `boards/${boardId}/notes/${id}`));

        // Add to undo stack
        addToUndoStack({ type: "DELETE_NOTE", data: noteToDelete });
        setRedoStack([]);
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    },
    [isReadOnly, boardId, notes, addToUndoStack]
  );

  const deleteShape = useCallback(
    async (id: string) => {
      if (isReadOnly || !user || !boardId) return;

      // Get shape data for undo
      const shapeToDelete = shapes.find((s) => s.id === id);
      if (!shapeToDelete) return;

      try {
        await remove(ref(database, `boards/${boardId}/shapes/${id}`));

        // Add to undo stack
        addToUndoStack({ type: "DELETE_SHAPE", data: shapeToDelete });
        setRedoStack([]);
      } catch (error) {
        console.error("Error deleting shape:", error);
      }
    },
    [isReadOnly, boardId, shapes, addToUndoStack]
  );
  const deleteSimpleText = useCallback(
    async (id: string) => {
      if (isReadOnly || !user || !boardId) return;
      const simpleTextToDelete = simpleTexts.find((n) => n.id === id);
      if (!simpleTextToDelete) return;
      try {
        await remove(ref(database, `boards/${boardId}/simpleTexts/${id}`));

        addToUndoStack({
          type: "DELETE_SIMPLE_TEXT",
          data: simpleTextToDelete,
        });
        setRedoStack([]);
      } catch (error) {
        console.error("Error deleting simpleText:", error);
      }
    },
    [isReadOnly, boardId, simpleTexts, addToUndoStack]
  );
  // Undo/Redo operations
  const undo = useCallback(async () => {
    if (isReadOnly || !user || undoStack.length === 0 || !boardId) return;

    const lastOperation = undoStack[undoStack.length - 1];
    isUndoRedoOperation.current = true;

    try {
      switch (lastOperation.type) {
        case "CREATE_NOTE":
          await remove(
            ref(database, `boards/${boardId}/notes/${lastOperation.data.id}`)
          );
          break;

        case "CREATE_SHAPE":
          await remove(
            ref(database, `boards/${boardId}/shapes/${lastOperation.data.id}`)
          );
          break;
        case "CREATE_SIMPLE_TEXT":
          await remove(
            ref(
              database,
              `boards/${boardId}/simpleTexts/${lastOperation.data.id}`
            )
          );
          break;

        case "UPDATE_NOTE":
          await update(
            ref(database, `boards/${boardId}/notes/${lastOperation.id}`),
            lastOperation.oldData
          );
          break;

        case "UPDATE_SHAPE":
          await update(
            ref(database, `boards/${boardId}/shapes/${lastOperation.id}`),
            lastOperation.oldData
          );
          break;
        case "UPDATE_SIMPLE_TEXT":
          await update(
            ref(database, `boards/${boardId}/simpleTexts/${lastOperation.id}`),
            lastOperation.oldData
          );

          break;

        case "DELETE_NOTE":
          await set(
            ref(database, `boards/${boardId}/notes/${lastOperation.data.id}`),
            lastOperation.data
          );
          break;

        case "DELETE_SHAPE":
          await set(
            ref(database, `boards/${boardId}/shapes/${lastOperation.data.id}`),
            lastOperation.data
          );
          break;
        case "DELETE_SIMPLE_TEXT":
          await set(
            ref(
              database,
              `boards/${boardId}/simpleTexts/${lastOperation.data.id}`
            ),
            lastOperation.data
          );
          break;
      }

      setUndoStack((prev) => prev.slice(0, -1)); // Remove last item
      setRedoStack((prev) => [lastOperation, ...prev]); // Add to redo stack
    } catch (error) {
      console.error("Error during undo:", error);
    } finally {
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 100);
    }
  }, [isReadOnly, undoStack, boardId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo]);

  const redo = useCallback(async () => {
    if (isReadOnly || !user || redoStack.length === 0 || !boardId) return;

    const operationToRedo = redoStack[0];
    isUndoRedoOperation.current = true;

    try {
      switch (operationToRedo.type) {
        case "CREATE_NOTE":
          await set(
            ref(database, `boards/${boardId}/notes/${operationToRedo.data.id}`),
            operationToRedo.data
          );
          break;

        case "CREATE_SHAPE":
          await set(
            ref(
              database,
              `boards/${boardId}/shapes/${operationToRedo.data.id}`
            ),
            operationToRedo.data
          );
          break;
        case "CREATE_SIMPLE_TEXT":
          await set(
            ref(
              database,
              `boards/${boardId}/simpleTexts/${operationToRedo.data.id}`
            ),
            operationToRedo.data
          );
          break;

        case "UPDATE_NOTE":
          await update(
            ref(database, `boards/${boardId}/notes/${operationToRedo.id}`),
            operationToRedo.newData
          );
          break;

        case "UPDATE_SHAPE":
          await update(
            ref(database, `boards/${boardId}/shapes/${operationToRedo.id}`),
            operationToRedo.newData
          );
          break;
        case "UPDATE_SIMPLE_TEXT":
          await update(
            ref(
              database,
              `boards/${boardId}/simpleTexts/${operationToRedo.id}`
            ),
            operationToRedo.newData
          );
          break;
        case "DELETE_NOTE":
          await remove(
            ref(database, `boards/${boardId}/notes/${operationToRedo.data.id}`)
          );
          break;

        case "DELETE_SHAPE":
          await remove(
            ref(database, `boards/${boardId}/shapes/${operationToRedo.data.id}`)
          );
          break;
        case "DELETE_SIMPLE_TEXT":
          await remove(
            ref(
              database,
              `boards/${boardId}/simpleTexts/${operationToRedo.data.id}`
            )
          );
          break;
      }

      setRedoStack((prev) => prev.slice(1)); // Remove from redo
      setUndoStack((prev) => [...prev, operationToRedo]); // Add back to undo
    } catch (error) {
      console.error("Error during redo:", error);
    } finally {
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 100);
    }
  }, [redoStack, boardId]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [redo]);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const setActiveToolInternal = (tool: ToolType) => {
    if (userPermission === "view") return;
    setActiveTool(tool);
  };
  return (
    <BoardContext.Provider
      value={{
        activeTool,
        setActiveTool,
        setActiveToolInternal,
        userPermission,
        isReadOnly,
        selectedColor,
        setSelectedColor,
        selectedElementId,
        setSelectedElementId,
        notes,
        shapes,
        simpleTexts,
        userNames,
        createNote,
        cursors,
        trackCursor,
        createShape,
        createSimpleText,
        updateNote,
        updateShape,
        updateSimpleText,
        deleteNote,
        deleteShape,
        deleteSimpleText,
        undo,
        redo,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
};
