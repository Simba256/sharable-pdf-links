'use client'

import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  isSearching: boolean
  matchCount: number
}

export default function SearchBar({ onSearch, isSearching, matchCount }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    onSearch('')
  }

  return (
    <div className="fixed top-4 right-4 z-20">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-full shadow-lg transition-colors"
          aria-label="Open search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      ) : (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[300px]">
          <form onSubmit={handleSearch} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in PDF..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              disabled={!searchQuery.trim()}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-500 hover:text-gray-700"
              aria-label="Close search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </form>
          {isSearching && (
            <div className="text-sm text-gray-600">Searching...</div>
          )}
          {!isSearching && matchCount > 0 && (
            <div className="text-sm text-gray-700">
              Found {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </div>
          )}
          {!isSearching && searchQuery && matchCount === 0 && (
            <div className="text-sm text-gray-500">No matches found</div>
          )}
        </div>
      )}
    </div>
  )
}
