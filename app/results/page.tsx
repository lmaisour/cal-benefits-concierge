import type { Metadata } from "next";
import { ResultsPage } from "@/components/results/results-page";

export const metadata: Metadata = {
  title: "Your program matches",
  description:
    "See California benefit programs that may apply based on the household details you provided.",
};

export default function ResultsRoutePage() {
  return <ResultsPage />;
}
