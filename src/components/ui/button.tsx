import * as React from "react"
export function Button({ children, ...props }: any) {
  return <button {...props} className="px-4 py-2 bg-blue-500 text-white rounded-lg sm:px-5 sm:py-3 hover:bg-blue-600 focus:outline-none">{children}</button>
}
