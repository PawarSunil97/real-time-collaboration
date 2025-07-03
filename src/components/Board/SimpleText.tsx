import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { FaTimes } from "react-icons/fa";
import { useBoard } from "../../context/BoardContext";

export interface SimpleTextProps {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  createdBy: string;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onResize: (id: string, w: number, h: number) => void;
  onDragStop: (id: string, x: number, y: number) => void;
  onRotate: (id: string, rotation: number) => void;
  scale: number;
}

const SimpleText: React.FC<SimpleTextProps> = ({
  id,
  text,
  x,
  y,
  width,
  height,
  rotation,
  color,
  createdBy,
  selected,
  onSelect,
  onDelete,
  onTextChange,
  onResize,
  onDragStop,
  scale,
}) => {
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalText(text);
  }, [text]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [editing]);

  const handleDragStop = (_: any, data: any) => {
    onDragStop(id, data.x, data.y);
  };

  const handleResizeStop = (
    _e: any,
    _direction: any,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number }
  ) => {
    onResize(id, parseInt(ref.style.width), parseInt(ref.style.height));
    onDragStop(id, position.x, position.y);
  };

  const handleBlur = () => {
    setEditing(false);
    if (localText !== text) {
      onTextChange(id, localText);
    }
  };

  // Long-press for mobile to enter editing mode
  const handleTouchStart = () => {
    longPressTimeout.current = setTimeout(() => {
      setEditing(true);
    }, 500); // 500ms = long press
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  return (
   <Rnd
  size={{ width, height }}
  position={{ x, y }}
  onDragStop={handleDragStop}
  onResizeStop={handleResizeStop}
  enableResizing={!editing}
  style={{
    transform: `rotate(${rotation}deg)`,
    zIndex: selected ? 5 : 1,
  }}
  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(id);
  }}
>
  {/* 👇 This outer div contains text content */}
  <div
    style={{
      width: "100%",
      height: "100%",
     border: selected ? "1px dashed #007bff" : "none",
          backgroundColor: "transparent",
      padding: "4px",
      position: "relative",
      boxSizing: "border-box",
      overflow: "hidden",
      borderRadius: 6,
    }}
    onDoubleClick={() => setEditing(true)}
  >
    {editing ? (
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleBlur}
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          fontSize: 16,
          background: "transparent",
          color: "#000",
        }}
      />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          cursor: "pointer",
        }}
      >
        {text || "Double-click to edit"}
      </div>
    )}
  </div>

  {/* 👇 Delete button outside the box */}
  {selected && !editing && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(id);
      }}
      style={{
        position: "absolute",
        top: -14,
        right: -14,
        background: "red",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: 20,
        height: 20,
        fontSize: 12,
        cursor: "pointer",
        zIndex: 1000,
      }}
    >
      <FaTimes />
    </button>
  )}
</Rnd>

  );
};

export default SimpleText;
