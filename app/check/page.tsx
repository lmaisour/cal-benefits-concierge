import type { Metadata } from "next";
import { Questionnaire } from "@/components/questionnaire/questionnaire";

export const metadata: Metadata = {
  title: "Check my benefits",
  description:
    "Answer a few questions about your household. We’ll use your answers to find California programs you may qualify for.",
};

export default function CheckPage() {
  return <Questionnaire />;
}
