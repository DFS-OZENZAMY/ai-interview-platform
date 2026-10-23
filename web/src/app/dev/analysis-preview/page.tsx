import { notFound } from "next/navigation";
import { InterviewAnalysisLoader } from "@/components/ui/interview-analysis-loader";

export default function AnalysisPreviewPage() {
  // Never expose the prototype preview URL in production.
  if (process.env.NODE_ENV !== "development") notFound();
  return <InterviewAnalysisLoader />;
}
