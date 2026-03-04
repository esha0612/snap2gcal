import { Hero } from "./components/hero";
import { Features } from "./components/features";
import { HowItWorks } from "./components/how-it-works";
import { DemoSection } from "./components/demo-section";
import { UseCases } from "./components/use-cases";
import { TargetAudience } from "./components/target-audience";
import { Footer } from "./components/footer";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Features />
      <HowItWorks />
      <DemoSection />
      <UseCases />
      <TargetAudience />
      <Footer />
    </div>
  );
}
