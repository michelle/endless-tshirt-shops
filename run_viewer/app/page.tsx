import type { Metadata } from "next";
import Viewer from "./Viewer";

export const metadata: Metadata = {
  title: "Benchmark run viewer",
  description: "Inspect benchmark reports, model outputs, and full-canvas t-shirt artwork.",
};

export default function Home() {
  return <Viewer />;
}
