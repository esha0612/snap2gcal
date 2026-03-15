import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GraduationCap, Briefcase, TrendingUp } from "lucide-react";

export function TargetAudience() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-6">
              Built For Busy People Like You
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Stop wasting precious time manually re-entering event details. 
              Our AI understands your hectic schedule and helps you stay organized effortlessly.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">College Students</h3>
                  <p className="text-gray-600">Juggling classes, clubs, social events, and study groups</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Early Career Professionals</h3>
                  <p className="text-gray-600">Managing meetings, networking events, and work-life balance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Anyone Who Values Time</h3>
                  <p className="text-gray-600">Save hours every month with automated event management</p>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>
  );
}
