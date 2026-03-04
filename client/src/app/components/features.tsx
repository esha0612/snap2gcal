import { Brain, Calendar, Clock, Zap, Shield, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const features = [
  {
    icon: Brain,
    title: "Intelligent Extraction",
    description: "Advanced AI analyzes screenshots to extract event title, date, time, location, and notes with high accuracy.",
    color: "text-blue-600"
  },
  {
    icon: Clock,
    title: "Ambiguity Resolution",
    description: "Smart reasoning about relative dates like 'next Friday' or 'this weekend' based on context and current date.",
    color: "text-purple-600"
  },
  {
    icon: Calendar,
    title: "Auto-Scheduling",
    description: "Seamlessly creates events directly in your Google Calendar without any manual data entry.",
    color: "text-green-600"
  },
  {
    icon: Zap,
    title: "Conflict Detection",
    description: "Automatically identifies scheduling conflicts and suggests alternative times for your events.",
    color: "text-orange-600"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Generates contextual reminders based on event type, location, and your preferences.",
    color: "text-red-600"
  },
  {
    icon: Shield,
    title: "Edit Suggestions",
    description: "AI reviews extracted data and suggests corrections or improvements before finalizing.",
    color: "text-indigo-600"
  }
];

export function Features() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Your Intelligent Scheduling Assistant
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powered by advanced AI to handle every aspect of event management
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
