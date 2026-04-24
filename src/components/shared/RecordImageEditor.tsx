/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiImageUpload, type PickedFile, uploadFilesParallel } from '@/components/shared/MultiImageUpload';
import { Loader2, Save, Trash2, ImageIcon, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { prescriptionsAPI, xraysAPI } from '@/lib/api';

type RecordKind = 'prescription' | 'xray';

interface RecordImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: RecordKind;
  recordId: number;
  primary?: string | null;
  images?: string[] | null;
  onSaved?: (next: { image_url: string | null; images: string[] }) => void;
  onDeleted?: () => void;
  patientLabel?: string;
}

/**
 * Admin-only editor that lets you remove existing image attachments,
 * upload more, or delete the entire record. Works for both prescriptions
 * and x-rays — they share the same `image_url + images[]` shape.
 */
export function RecordImageEditor({
  open, onOpenChange, kind, recordId, primary, images,
  onSaved, onDeleted, patientLabel,
}: RecordImageEditorProps) {
  const { toast } = useToast();

  const initial = React.useMemo(() => {
    const set = new Set<string>();
    if (primary) set.add(primary);
    for (const u of images || []) if (u) set.add(u);
    return Array.from(set);
  }, [primary, images]);

  const [existing, setExisting] = React.useState<string[]>(initial);
  const [picked, setPicked] = React.useState<PickedFile[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setExisting(initial);
      setPicked([]);
    }
  }, [open, initial]);

  const removed = initial.filter(u => !existing.includes(u));
  const dirty = removed.length > 0 || picked.length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      // Upload any new picked files
      const uploadedUrls = await uploadFilesParallel(
        picked,
        async (file) => kind === 'prescription'
          ? prescriptionsAPI.uploadImage(file, recordId)
          : xraysAPI.uploadImage(file, recordId),
      );
      const finalList = [...existing, ...uploadedUrls];
      const finalPrimary: string | null = finalList[0] || null;

      const updates = {
        image_url: finalPrimary,
        images: finalList.length > 1 ? finalList.slice(1) : [],
      } as any;

      if (kind === 'prescription') {
        await prescriptionsAPI.update(recordId, updates as any);
      } else {
        const { error } = await (supabase as any).from('xrays').update(updates).eq('id', recordId);
        if (error) throw error;
      }

      // Best-effort: try to remove the unreferenced storage objects we just dropped.
      // (We don't fail the save if storage delete fails — the record is the source of truth.)
      removed.forEach(url => { void tryDeleteStorageObject(kind, url); });

      onSaved?.({ image_url: finalPrimary, images: updates.images });
      toast({ title: 'Saved', description: 'Images updated successfully.' });
      onOpenChange(false);
    } catch (err) {
      console.error('[RecordImageEditor] save failed', err);
      toast({ title: 'Error', description: 'Could not save image changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord() {
    try {
      const table = kind === 'prescription' ? 'prescriptions' : 'xrays';
      const { error } = await (supabase as any).from(table).delete().eq('id', recordId);
      if (error) throw error;

      // Best-effort cleanup of all storage objects
      initial.forEach(url => { void tryDeleteStorageObject(kind, url); });

      toast({ title: 'Deleted', description: kind === 'prescription' ? 'Prescription deleted.' : 'X-ray record deleted.' });
      setConfirmDelete(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      console.error('[RecordImageEditor] delete failed', err);
      toast({ title: 'Error', description: 'Could not delete record.', variant: 'destructive' });
    }
  }

  const totalAfter = existing.length + picked.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-secondary" />
              {kind === 'prescription' ? 'Edit Prescription Images' : 'Edit X-Ray Images'}
            </DialogTitle>
            {patientLabel && (
              <p className="text-xs text-muted-foreground">For: <span className="text-foreground font-medium">{patientLabel}</span></p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/90">
                Hover any thumbnail and click the <strong>x</strong> to remove that image. You can drop in additional images below. Changes are saved together when you click <strong>Save</strong>.
              </p>
            </div>

            <MultiImageUpload
              value={picked}
              onChange={setPicked}
              existingUrls={existing}
              onRemoveExisting={(url) => setExisting(prev => prev.filter(u => u !== url))}
              maxFiles={10}
              maxSizeMB={kind === 'xray' ? 15 : 10}
              label={kind === 'prescription' ? 'Drag prescriptions here or click to add more' : 'Drag x-rays here or click to add more'}
            />

            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Total after save: <strong className="text-foreground">{totalAfter}</strong> image{totalAfter === 1 ? '' : 's'}</span>
              {removed.length > 0 && <span className="text-destructive">{removed.length} removed</span>}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4" /> Delete entire record
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={!dirty || saving} className="gap-1.5">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {kind === 'prescription' ? 'prescription' : 'x-ray record'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {kind === 'prescription' ? 'prescription' : 'x-ray'} and all of its images. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

async function tryDeleteStorageObject(kind: RecordKind, publicUrl: string) {
  try {
    const bucket = kind === 'prescription' ? 'prescriptions' : 'xrays';
    // public URL pattern: .../object/public/<bucket>/<path>
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) return;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    await (supabase as any).storage.from(bucket).remove([path]);
  } catch {
    // Silent — record-row delete already succeeded.
  }
}
