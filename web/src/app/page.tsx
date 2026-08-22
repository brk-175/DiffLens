import { UploadArea } from "@/components/upload-area";
import { PasteArea } from "@/components/paste-area";

export default function Home() {
  return (
    <main className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">DiffLens</h1>
      <p className="text-muted-foreground">
        Upload or paste a diff file to start the review.
      </p>
      <div className="space-y-4">
        <UploadArea onFileSelected={(file) => console.log(file)} />
        <PasteArea />
      </div>
    </main>
  );
}
