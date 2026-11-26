'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatDateTimeInZone } from '@/lib/utilities/dates';
import {
  deleteAttachment,
  getAttachmentSignedUrl,
  listAttachments,
  uploadTopicAttachment,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';

export function AttachmentsModule({
  userId,
  topicId,
  timezone,
}: {
  userId: string;
  topicId: string;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', userId, topicId],
    queryFn: () => listAttachments(createClient(), userId, topicId),
  });

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadTopicAttachment(createClient(), userId, topicId, file, 'topic', topicId);
      await queryClient.invalidateQueries({ queryKey: ['attachments'] });
      pushToast({ kind: 'success', title: `Uploaded "${file.name}"` });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Check file size (max 10 MB) and type.',
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" aria-hidden="true" />
            Private Attachments ({attachments.length})
          </CardTitle>
          <label className="inline-flex min-h-11 cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:opacity-95">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload File (max 10 MB)'}
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void handleUpload(file);
              }}
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            title="No files attached yet"
            description="Attach a file to keep it with this topic. Each file can be up to 10 MB."
          />
        ) : (
          <div className="divide-y divide-border">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium">{att.file_name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {(att.size_bytes / 1024).toFixed(1)} KB •{' '}
                    {formatDateTimeInZone(att.created_at, timezone)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const url = await getAttachmentSignedUrl(createClient(), att.storage_path);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${att.file_name}`}
                    onClick={async () => {
                      await deleteAttachment(createClient(), userId, att);
                      await queryClient.invalidateQueries({ queryKey: ['attachments'] });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
