"use client"

import { useEffect, useState } from "react"
import { Grid3X3, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type ViewMode = "cards" | "table"

interface PostsViewToggleProps {
  value: ViewMode
  onChange: (view: ViewMode) => void
}

export function PostsViewToggle({ value, onChange }: PostsViewToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex rounded-lg border p-1 bg-muted/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={value === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => onChange("cards")}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
          >
            Cards View
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={value === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onChange("table")}
              className="h-8 px-3"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
          >
            Table View
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Hook to manage view state with localStorage persistence
export function usePostsView() {
  const [view, setView] = useState<ViewMode>("cards")

  useEffect(() => {
    const saved = localStorage.getItem("posts-view-mode")
    if (saved === "cards" || saved === "table") {
      setView(saved)
    }
  }, [])

  const setViewWithPersistence = (newView: ViewMode) => {
    setView(newView)
    localStorage.setItem("posts-view-mode", newView)
  }

  return [view, setViewWithPersistence] as const
}