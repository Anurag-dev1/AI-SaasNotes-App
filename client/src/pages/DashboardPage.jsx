import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNotes, useCreateNote } from '../hooks/useNotes';
import NoteCard from '../components/NoteCard';
import useNotesStore from '../store/notesStore';

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedTag, setSelectedTag } = useNotesStore();
  const { data, isLoading } = useNotes(page, 10, selectedTag);
  
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' });
  const createMutation = useCreateNote();

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const tagsArray = newNote.tags.split(',').map(t => t.trim()).filter(Boolean);
    await createMutation.mutateAsync({ ...newNote, tags: tagsArray });
    setIsModalOpen(false);
    setNewNote({ title: '', content: '', tags: '' });
  };

  // Derive unique tags from current data (simplistic approach for UI)
  const uniqueTags = Array.from(new Set(data?.notes?.flatMap(note => note.tags) || []));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2 -ml-1" /> Create Note
        </button>
      </div>

      {uniqueTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${!selectedTag ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {uniqueTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${selectedTag === tag ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse border border-gray-200"></div>
          ))}
        </div>
      ) : data?.notes?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">No notes found</h3>
          <p className="mt-1 text-gray-500">Get started by creating a new note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.notes?.map(note => (
            <NoteCard key={note._id} note={note} />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded bg-white text-gray-600 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-600">Page {page} of {data.pagination.pages}</span>
          <button
            disabled={page === data.pagination.pages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded bg-white text-gray-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create New Note</h2>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea required rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                  <input className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g. meeting, idea" value={newNote.tags} onChange={e => setNewNote({ ...newNote, tags: e.target.value })} />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button type="submit" disabled={createMutation.isPending} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 sm:col-start-2 sm:text-sm disabled:opacity-70">
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:col-start-1 sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
