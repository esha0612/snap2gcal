import { Upload, Scan, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Screenshot",
    description: "Snap or upload a screenshot from Instagram stories, group chats, Slack, email, or event flyers.",
    color: "bg-blue-100 text-blue-600"
  },
  {
    icon: Scan,
    step: "02",
    title: "AI Extracts & Analyzes",
    description: "Our AI instantly reads the image, extracts event details, and resolves any ambiguous dates or times.",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Auto-Create Event",
    description: "Review AI suggestions, approve edits, and the event is automatically added to your Google Calendar.",
    color: "bg-green-100 text-green-600"
  }
];

export function HowItWorks() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Three simple steps to effortless event scheduling
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection lines for desktop */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 -z-10"></div>
          
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${step.color}`}>
                  <step.icon className="h-10 w-10" />
                </div>
                
                <div className="mb-3 text-sm font-semibold text-gray-500">{step.step}</div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
