import { Card, CardContent } from "./ui/card";
import { Instagram, Mail, MessageSquare, FileText, Image as ImageIcon, Users } from "lucide-react";

const useCases = [
  {
    icon: Instagram,
    title: "Instagram Stories",
    description: "Concert announcements, party invites, event promos",
    color: "bg-gradient-to-br from-purple-500 to-pink-500"
  },
  {
    icon: MessageSquare,
    title: "Group Chats",
    description: "WhatsApp, iMessage, Telegram event plans",
    color: "bg-gradient-to-br from-green-500 to-emerald-500"
  },
  {
    icon: FileText,
    title: "Event Flyers",
    description: "Campus events, workshops, conferences",
    color: "bg-gradient-to-br from-blue-500 to-cyan-500"
  },
  {
    icon: Users,
    title: "Slack Screenshots",
    description: "Team meetings, company events, happy hours",
    color: "bg-gradient-to-br from-indigo-500 to-purple-500"
  },
  {
    icon: Mail,
    title: "Email Screenshots",
    description: "Meeting invites, webinar registrations",
    color: "bg-gradient-to-br from-red-500 to-orange-500"
  },
  {
    icon: ImageIcon,
    title: "Any Image",
    description: "Posters, tickets, announcements",
    color: "bg-gradient-to-br from-yellow-500 to-orange-500"
  }
];

export function UseCases() {
  return (
    <div className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Works With Any Screenshot
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Designed for the way busy students and professionals receive event information
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase) => (
            <Card key={useCase.title} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
              <CardContent className="p-6">
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${useCase.color}`}>
                  <useCase.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{useCase.title}</h3>
                <p className="text-gray-400">{useCase.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
