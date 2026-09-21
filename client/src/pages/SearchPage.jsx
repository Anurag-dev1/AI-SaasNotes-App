import { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useKeywordSearch, useSemanticSearch } from '../hooks/useSearch';
import NoteCard from '../components/NoteCard';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mode, setMode] = useState('keyword'); // 'keyword' | 'semantic'
  const semanticMutation = useSemanticSearch();

  // Debounce for keyword search
  useEffect(() => {
    if (mode === 'keyword') {
      const timer = setTimeout(() => setDebouncedQuery(query), 500);
      return () => clearTimeout(timer);
    }
  }, [query, mode]);

  const { data: keywordData, isLoading: isKeywordLoading } = useKeywordSearch(debouncedQuery, 1);

  const handleSemanticSubmit = async (e) => {
    e.preventDefault();
    if (!query) return;
    await semanticMutation.mutateAsync({ query, limit: 10 });
  };

  const renderResults = () => {
    if (mode === 'keyword') {
      if (isKeywordLoading) return <div className="py-8 text-center">Searching...</div>;
      if (!debouncedQuery) return <div className="py-8 text-center text-gray-500">Type to search notes</div>;
      if (keywordData?.results?.length === 0) return <div className="py-8 text-center text-gray-500">No results found</div>;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {keywordData?.results?.map(note => <NoteCard key={note._id} note={note} />)}
        </div>
      );
    } else {
      if (semanticMutation.isPending) return <div className="py-8 text-center">Thinking...</div>;
      if (!semanticMutation.data) return <div className="py-8 text-center text-gray-500">Ask a question to search semantically</div>;
      if (semanticMutation.data.length === 0) return <div className="py-8 text-center text-gray-500">No relevant notes found</div>;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {semanticMutation.data.map(result => (
            <div key={result._id} className="relative">
              <div className="absolute -top-2 -right-2 bg-primary-100 text-primary-800 text-xs font-bold px-2 py-1 rounded-full z-10 border border-primary-200">
                Match: {(result.score * 100).toFixed(0)}%
              </div>
              <NoteCard note={result} />
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Search Notes</h1>
        
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => { setMode('keyword'); semanticMutation.reset(); }}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${mode === 'keyword' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Search className="w-4 h-4 inline mr-2" /> Keyword
          </button>
          <button
            onClick={() => { setMode('semantic'); setDebouncedQuery(''); }}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${mode === 'semantic' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" /> AI Semantic
          </button>
        </div>

        {mode === 'semantic' ? (
          <form onSubmit={handleSemanticSubmit} className="relative">
            <input
              type="text"
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 text-lg"
              placeholder="Ask a question about your notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="absolute right-2 top-2 p-2 text-primary-600 hover:bg-primary-50 rounded-md">
              <Search className="w-5 h-5" />
            </button>
          </form>
        ) : (
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-gray-900 focus:border-gray-900 text-lg"
              placeholder="Search by keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-8">
        {renderResults()}
      </div>
    </div>
  );
}
