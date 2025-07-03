import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { Button } from "react-bootstrap";

export interface NoteProps {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  createdBy: string;
  currentUser: string;
  userNames?: Record<string, string>;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onDragStop: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  scale?: number;
}

const isTouchDevice = (): boolean => {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

const Note: React.FC<NoteProps> = ({
  id,
  text: propText,
  x,
  y,
  width = 200,
  height = 120,
  color = "#ffc107",
  createdBy,
  currentUser,
  userNames,
  selected,
  onSelect,
  onDragStop,
  onResize,
  onDelete,
  onTextChange,
  scale = 1,
}) => {
  const [editText, setEditText] = useState(propText);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(propText);
  }, [propText]);

  // Auto-focus textarea when note is created (empty text)
  useEffect(() => {
    if (selected && !propText && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [selected, propText]);

  const getOwnerDisplayName = (): string => {
    if (currentUser === createdBy) return "You";
    const userName = userNames?.[createdBy];
    if (userName) return userName;
    if (createdBy.includes("@")) return createdBy.split("@")[0];
    return createdBy || "Unknown User";
  };

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(true);
    onSelect(id);
    e.stopPropagation();
  };

  const handleTextareaBlur = () => {
    setIsEditing(false);
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleTextareaTouch = (e: React.TouchEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // If clicking on the textarea, don't handle at container level
    if (target.tagName === 'TEXTAREA') {
      return;
    }
    
    e.stopPropagation();
    onSelect(id);
  };

  const handleContainerTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // If touching the textarea, don't handle at container level
    if (target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Don't interfere with interactive elements
    if (["TEXTAREA", "INPUT", "BUTTON", "SVG", "PATH"].includes(target.tagName.toUpperCase())) {
      return;
    }
    
    onSelect(id);
    e.stopPropagation();
  };

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      bounds="parent"
      scale={scale}
      disableDragging={isEditing} // Disable dragging while editing text
      enableResizing={!isTouchDevice() ? undefined : { bottomRight: true }}
      style={{ zIndex: selected ? 1000 : 1 }}
      onClick={handleContainerClick}
      onTouchStart={handleContainerTouch}
      onDragStop={(_, data) => onDragStop(id, data.x, data.y)}
      onResizeStop={(_, __, ref, ____, position) => {
        onResize(id, ref.offsetWidth, ref.offsetHeight);
        onDragStop(id, position.x, position.y);
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "6px",
          border: selected ? "2px solid #007bff" : "2px solid transparent",
          boxShadow: selected
            ? "0 0 10px rgba(0,123,255,0.6)"
            : "0 2px 8px rgba(0,0,0,0.05)",
          background: "transparent",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: color,
            boxShadow:
              "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            cursor: isEditing ? "default" : (isTouchDevice() ? "default" : "move"),
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "rgba(0,0,0,0.05)",
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: "28px",
              cursor: isTouchDevice() ? "default" : "move",
            }}
          >
            <small
              style={{
                fontSize: "11px",
                color: "#444",
                fontWeight: "500",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "calc(100% - 30px)",
              }}
            >
              {getOwnerDisplayName()}
            </small>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onDelete(id);
              }}
              onTouchEnd={(e: React.TouchEvent) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(id);
              }}
              style={{
                padding: "2px 6px",
                fontSize: "12px",
                lineHeight: "1",
                border: "none",
                backgroundColor: "transparent",
                color: "#dc3545",
                minWidth: "20px",
                height: "20px",
              }}
            >
              ×
            </Button>
          </div>
          <div
            style={{
              flex: 1,
              padding: "10px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const newText = e.target.value;
                setEditText(newText);
                onTextChange(id, newText);
              }}
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
              onClick={handleTextareaClick}
              onTouchStart={handleTextareaTouch}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              placeholder="Type your note here..."
              style={{
                width: "100%",
                height: "100%",
                resize: "none",
                background: "transparent",
                border: "none",
                outline: "none",
                lineHeight: "1.4",
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#333",
                cursor: "text",
                padding: "0",
                // Enhanced touch support
                touchAction: "manipulation",
                WebkitTouchCallout: "none",
                WebkitTapHighlightColor: "transparent",
                WebkitUserSelect: "text",
                userSelect: "text",
                fontSize: isTouchDevice() ? "16px" : "13px",
              }}
            />
          </div>
        </div>
      </div>
    </Rnd>
  );
};

export default Note;