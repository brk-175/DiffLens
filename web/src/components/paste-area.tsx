import { useState } from "react";

export function PasteArea() {
  const [content, setContent] = useState("");

  return (
    <textarea
      className="w-full h-40 p-2 border rounded-md font-mono"
      placeholder="Paste your diff here..."
      value={content}
      onChange={(e) => setContent(e.target.value)}
    />
  );
}
