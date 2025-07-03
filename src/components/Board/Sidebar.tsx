import React, { useState } from "react";
import { useBoard } from "../../context/BoardContext";
import {
  PiNoteBold,
  PiSquareBold,
  PiCircleBold,
  PiPencilSimpleBold,
  PiArrowBendUpLeftBold,
  PiArrowBendUpRightBold,
  PiPaletteBold,
} from "react-icons/pi";
import { CiText } from "react-icons/ci";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

const colors = [
  "#000000",
  "#ffc107",
  "#f28b82",
  "#ccff90",
  "#aecbfa",
  "#d7aefb",
  "#2196F3",
];

const Sidebar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    selectedColor,
    setSelectedColor,
    undo,
    redo,
    canUndo,
    canRedo,
    isReadOnly,
  } = useBoard();

  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleToolClick = (
    tool: "note" | "rectangle" | "circle" | "line" | "simpleText"
  ) => {
    if (isReadOnly) return;
    setActiveTool(tool);
  };

  return (
    <div
      className="position-relative d-flex flex-column justify-content-between align-items-center"
      style={{
        height: "100vh",
        width: "60px",
        borderRight: "1px solid #ddd",
        margin: "5px",
        borderRadius: "20px",
        position: "sticky",
        top: 0,
        padding: "10px 0",
      }}
    >
      <div className="d-flex flex-column align-items-center gap-3">
        {/* Color Picker Button */}
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip>
              {isReadOnly ? "View only: Cannot change color" : "Color"}
            </Tooltip>
          }
        >
          <span>
            <Button
              variant="light"
              className="p-2"
              onClick={() => setShowColorPicker(!showColorPicker)}
              disabled={isReadOnly}
            >
              <PiPaletteBold size={20} />
            </Button>
          </span>
        </OverlayTrigger>

        {/* Color Picker Panel */}
        {showColorPicker && !isReadOnly && (
          <div
            className="position-absolute bg-white p-2 shadow rounded"
            style={{
              left: "60px",
              top: "10px",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {colors.map((color) => (
              <div
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  setShowColorPicker(false);
                }}
                style={{
                  backgroundColor: color,
                  width: 24,
                  height: 24,
                  marginBottom: 8,
                  border:
                    selectedColor === color
                      ? "2px solid black"
                      : "1px solid gray",
                  cursor: "pointer",
                  borderRadius: 4,
                }}
              />
            ))}
          </div>
        )}

        {/* Drawing Tools */}
        {[
          { icon: <PiNoteBold size={20} />, tool: "note", label: "Note" },
          { icon: <PiSquareBold size={20} />, tool: "rectangle", label: "Rectangle" },
          { icon: <PiCircleBold size={20} />, tool: "circle", label: "Circle" },
          { icon: <PiPencilSimpleBold size={20} />, tool: "line", label: "Line" },
          { icon: <CiText size={20} />, tool: "simpleText", label: "Text" },
        ].map(({ icon, tool, label }) => (
          <OverlayTrigger
            key={tool}
            placement="right"
            overlay={
              <Tooltip>
                {isReadOnly ? `View only: Cannot use ${label}` : label}
              </Tooltip>
            }
          >
            <span>
              <Button
                variant={activeTool === tool ? "primary" : "light"}
                className="p-2"
                onClick={() => handleToolClick(tool as any)}
                disabled={isReadOnly}
              >
                {icon}
              </Button>
            </span>
          </OverlayTrigger>
        ))}

        {/* Undo */}
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip>
              {isReadOnly ? "View only: Undo disabled" : "Undo"}
            </Tooltip>
          }
        >
          <span>
            <Button
              variant="light"
              className="p-2"
              onClick={undo}
              disabled={!canUndo || isReadOnly}
            >
              <PiArrowBendUpLeftBold size={20} />
            </Button>
          </span>
        </OverlayTrigger>

        {/* Redo */}
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip>
              {isReadOnly ? "View only: Redo disabled" : "Redo"}
            </Tooltip>
          }
        >
          <span>
            <Button
              variant="light"
              className="p-2"
              onClick={redo}
              disabled={!canRedo || isReadOnly}
            >
              <PiArrowBendUpRightBold size={20} />
            </Button>
          </span>
        </OverlayTrigger>
      </div>
    </div>
  );
};

export default Sidebar;
