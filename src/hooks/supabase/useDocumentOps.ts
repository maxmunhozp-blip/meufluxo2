import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectDocument } from '@/types/document';
import { mapDbDocument } from './types';

interface DocumentOpsState {
  session: { user: { id: string } } | null;
  activeWorkspaceId: string | null;
  documentsState: ProjectDocument[];
  setDocumentsState: React.Dispatch<React.SetStateAction<ProjectDocument[]>>;
}

export function useDocumentOps(deps: DocumentOpsState) {
  const { session, activeWorkspaceId, documentsState, setDocumentsState } = deps;

  const createDocument = useCallback(async (projectId: string, workspaceId: string): Promise<ProjectDocument> => {
    if (!session?.user?.id) throw new Error('Usuário não autenticado');
    const position = documentsState.filter(d => d.projectId === projectId).length;

    const { data, error } = await supabase.from('project_documents').insert({
      project_id: projectId,
      workspace_id: workspaceId,
      created_by: session.user.id,
      title: 'Novo Documento',
      content: {},
      position,
    }).select().single();

    if (error) throw error;
    const doc = mapDbDocument(data);
    setDocumentsState(prev => prev.some(d => d.id === doc.id) ? prev : [...prev, doc]);
    return doc;
  }, [session, documentsState]);

  const updateDocument = useCallback(async (doc: Partial<ProjectDocument> & { id: string }) => {
    // Optimistic update
    setDocumentsState(prev => prev.map(d => d.id === doc.id ? { ...d, ...doc, updatedAt: new Date().toISOString() } : d));

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (doc.title !== undefined) updatePayload.title = doc.title;
    if (doc.content !== undefined) updatePayload.content = doc.content;
    if (doc.pinned !== undefined) updatePayload.pinned = doc.pinned;
    if (doc.position !== undefined) updatePayload.position = doc.position;

    const { error } = await supabase.from('project_documents').update(updatePayload).eq('id', doc.id);
    if (error) throw error;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    setDocumentsState(prev => prev.filter(d => d.id !== id));
    const { error } = await supabase.from('project_documents').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const reorderDocuments = useCallback(async (updates: { id: string; position: number }[]) => {
    // Optimistic update
    setDocumentsState(prev => prev.map(d => {
      const upd = updates.find(u => u.id === d.id);
      return upd ? { ...d, position: upd.position } : d;
    }));

    // Batch persist
    await Promise.all(
      updates.map(u =>
        supabase.from('project_documents').update({ position: u.position, updated_at: new Date().toISOString() }).eq('id', u.id)
      )
    );
  }, []);

  return { createDocument, updateDocument, deleteDocument, reorderDocuments };
}
