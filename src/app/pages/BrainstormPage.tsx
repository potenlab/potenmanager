import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function BrainstormPage() {
  return (
    <div className="w-full h-[calc(100vh-48px)]">
      <Tldraw
        persistenceKey="poten-brainstorm"
      />
    </div>
  );
}
