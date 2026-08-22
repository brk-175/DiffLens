import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
}

export function UploadArea({ onFileSelected }: UploadAreaProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".diff", ".patch"] },
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">
        {isDragActive ? "Drop the diff file here" : "Drag and drop your diff file here, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Supported formats: .diff, .patch</p>
    </div>
  );
}
