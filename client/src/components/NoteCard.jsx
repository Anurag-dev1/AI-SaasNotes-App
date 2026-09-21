import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import AiStatusBadge from './AiStatusBadge';
import { useDeleteNote } from '../hooks/useNotes';

export default function NoteCard({ note }) {
  const deleteMutation = useDeleteNote();

  const handleDelete = async (e) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteMutation.mutateAsync(note._id);
    }
  };

  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Link to={`/notes/${note._id}`} className="block group">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 p-5 h-full flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 flex-grow pr-2">{note.title}</h3>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 -mr-1"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {note.content}
        </p>

        <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-gray-50">
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{formattedDate}</span>
            <AiStatusBadge status={note.aiStatus} />
          </div>
        </div>
      </div>
    </Link>
  );
}
