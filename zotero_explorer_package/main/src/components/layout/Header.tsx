import { Card, CardContent } from "@/components/ui/card";

export function Header() {
  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-t-xl mb-6">
      <h1 className="flex items-center text-3xl font-bold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        Zotero Library Explorer
      </h1>
      <p className="text-lg opacity-90 mt-2">
        Explore your Zotero data with full hierarchy support
      </p>
    </div>
  );
}