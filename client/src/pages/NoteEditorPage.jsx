import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { useNote, useUpdateNote, useDeleteNote } from '../hooks/useNotes';
import { useAiStatus } from '../hooks/useAiStatus';
import AiStatusBadge from '../components/AiStatusBadge';

export default function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(id);
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const { data: aiStatusData } = useAiStatus(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsStr(note.tags ? note.tags.join(', ') : '');
    }
  }, [note]);

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      const tagsArray = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      await updateMutation.mutateAsync({
        id,
        noteData: { title, content, tags: tagsArray }
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      alert(err.response?.data?.error || 'Failed to save note');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this note?')) {
      await deleteMutation.mutateAsync(id);
      navigate('/dashboard');
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!note) return <div className="p-8">Note not found</div>;

  const currentAiStatus = aiStatusData?.aiStatus || note.aiStatus;
  const currentSummary = aiStatusData?.aiSummary || note.aiSummary;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <Link to="/dashboard" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <AiStatusBadge status={currentAiStatus} />
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-70"
          >
            <Save className="w-4 h-4 mr-1" /> 
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-red-600 bg-white hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <input
            type="text"
            className="w-full text-3xl font-bold border-0 border-b border-transparent hover:border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title"
          />
        </div>
        
        <div>
          <textarea
            className="w-full h-96 resize-y border-0 border-b border-transparent hover:border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors text-gray-800"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing your note here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="e.g. meeting, planning"
          />
        </div>

        {currentSummary && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              ✨ AI Summary
            </h4>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{currentSummary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
