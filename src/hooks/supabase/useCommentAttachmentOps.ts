import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Comment, Attachment } from '@/types/task';
import { SharedState } from './types';

export function useCommentAttachmentOps(deps: SharedState) {
  const { session, profilesState, attachmentsState, setCommentsState, setAttachmentsState } = deps;

  const addComment = useCallback(async (taskId: string, text: string) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('comments').insert({
      task_id: taskId, content: text, user_id: session.user.id,
    }).select().single();
    if (error) throw error;
    const profile = profilesState.find(p => p.id === session.user.id);
    const comment: Comment = {
      id: data.id, taskId: data.task_id, author: profile?.fullName || 'Você',
      authorId: data.user_id, text: data.content, date: data.created_at,
    };
    setCommentsState(prev => prev.some(c => c.id === data.id) ? prev : [...prev, comment]);
  }, [session, profilesState]);

  const deleteComment = useCallback(async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setCommentsState(prev => prev.filter(c => c.id !== commentId));
  }, []);

  const uploadAttachment = useCallback(async (taskId: string, file: File) => {
    if (!session?.user?.id) return;
    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${taskId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, { contentType: file.type });
    if (uploadError) { toast.error('Erro ao enviar arquivo'); throw uploadError; }
    const { error: dbError } = await (supabase.from('task_attachments' as any) as any).insert({
      task_id: taskId, user_id: session.user.id, file_name: file.name,
      file_path: filePath, file_size: file.size, content_type: file.type || null,
    });
    if (dbError) { toast.error('Erro ao salvar anexo'); throw dbError; }
    const { data: newAtt } = await (supabase.from('task_attachments' as any) as any)
      .select('*').eq('task_id', taskId).order('created_at', { ascending: false }).limit(1).single();
    if (newAtt) {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const attachment: Attachment = {
        id: newAtt.id, taskId: newAtt.task_id, userId: newAtt.user_id,
        fileName: newAtt.file_name, filePath: newAtt.file_path, fileSize: newAtt.file_size,
        contentType: newAtt.content_type, createdAt: newAtt.created_at,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-attachments/${newAtt.file_path}`,
      };
      setAttachmentsState(prev => prev.some(x => x.id === attachment.id) ? prev : [...prev, attachment]);
    }
    toast.success('Anexo enviado');
  }, [session]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const att = attachmentsState.find(a => a.id === attachmentId);
    if (!att) return;
    await supabase.storage.from('task-attachments').remove([att.filePath]);
    await (supabase.from('task_attachments' as any) as any).delete().eq('id', attachmentId);
    setAttachmentsState(prev => prev.filter(a => a.id !== attachmentId));
    toast.success('Anexo removido');
  }, [attachmentsState]);

  return { addComment, deleteComment, uploadAttachment, deleteAttachment };
}
