import { FaFilePdf } from "react-icons/fa";
import { toPng } from "html-to-image";
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { jsPDF } from "jspdf";

const imageWidth = 1024;
const imageHeight = 768;

export const DownloadPdfButton = (props: { useDiagram: any }) => {
  const { getNodes } = useReactFlow();

  const onClick = () => {
    props.useDiagram.deselectAll();
    // Same fit-to-content capture as DownloadImage: the minimap/controls/panels
    // live outside `.react-flow__viewport`, so capturing it excludes the chrome.
    const nodesBounds = getNodesBounds(getNodes());
    const transform = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.2
    );

    toPng(document.querySelector(".react-flow__viewport") as HTMLElement, {
      backgroundColor: "white",
      width: imageWidth,
      height: imageHeight,
      pixelRatio: 2,
      style: {
        width: `${imageWidth}`,
        height: `${imageHeight}`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
      },
    }).then((dataUrl) => {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [imageWidth, imageHeight],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, imageWidth, imageHeight);
      pdf.save("DiagramX.pdf");
    });
  };

  return (
    <button
      className="w-full dark:text-white dark:hover:bg-slate-800 hover:bg-gray-200 rounded-md p-1 flex flex-row gap-1 justify-between items-center"
      onClick={onClick}
    >
      Download PDF
      <FaFilePdf />
    </button>
  );
};

export default DownloadPdfButton;
