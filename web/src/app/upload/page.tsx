import { useState } from "react";
import { useRouter } from "next/navigation";
// ... other imports

export default function UploadPage() {
  const [diffText, setDiffText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  // ... other state and handlers

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="lg:col-span-7">
        <textarea
          className="w-full h-64 rounded-xl p-4 focus:ring-2 focus:ring-[#bbcb2e] transition-all placeholder:text-[#dddddd]/40 font-mono text-[14px] leading-[1.6]"
          placeholder="Paste your git diff or source code here..."
          value={diffText}
          onChange={(e) => {
            setDiffText(e.target.value);
            if (files.length > 0) setFiles([]);
          }}
        />
        <div className="scan-line-upload" />
        <div className="flex justify-between items-center px-1">
          <p className="text-[14px] leading-[1.5] text-[#dddddd]/50">
            Supports .diff
          </p>
        </div>
        {files.length > 1 && (
          <p className="px-1 text-[12px] leading-normal text-[#dddddd]/60">
            Multiple files selected. Current backend flow processes the first file for one review.
          </p>
        )}
      </div>
      <div className="lg:col-span-5 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-[12px] leading-3 tracking-wider font-bold text-[#dddddd]/60">
            REVIEW FOCUS MODE
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                key: "generic",
                // ... rest of modes
              }
            ].map((mode) => (
              <div key={mode.key} className="...">
                {/* ... */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
