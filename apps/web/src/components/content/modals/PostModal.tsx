
import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit3, Save, X, AlertTriangle } from "lucide-react";
import { CharacterCount } from "@/components/CharacterCount";
import { getPlatformConfig } from "@/constants/platforms";
import { postsAPI } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useRelatedDataPrefetch } from "@/hooks/useRelatedDataPrefetch";
import { EntityType, ContentView } from "@content-creation/types";
import type { PostView } from "@/types";

interface PostModalProps {
  postId?: string;
  post?: PostView | null; // Optional: can still pass data directly
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  initialMode?: "view" | "edit";
}

export default function PostModal({
  postId,
  post: externalPost,
  isOpen,
  onClose,
  onUpdate,
  initialMode = "view",
}: PostModalProps) {
  const [post, setPost] = useState<PostView | null>(externalPost || null);
  const [isLoading, setIsLoading] = useState(!externalPost);
  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const [editedData, setEditedData] = useState({
    title: "",
    content: "",
  });
  const [isSaving, startTransition] = useTransition();
  const toast = useToast();
  
  // Set up related data prefetching for posts
  const { prefetchWorkflowNext, prefetchRelatedData } = useRelatedDataPrefetch({
    entityType: EntityType.POST,
    entityId: postId,
    currentView: ContentView.POSTS,
    autoMode: true,
    respectConnection: true,
    disabled: !isOpen || isLoading,
  });

  // Fetch post if ID is provided and no external data
  useEffect(() => {
    // Skip if modal is not open or we already have data
    if (!isOpen || !postId || externalPost) {
      // Handle external post if provided
      if (externalPost) {
        setPost(externalPost);
        setEditedData({
          title: externalPost.title,
          content: externalPost.content,
        });
      }
      return;
    }
    
    // Prevent multiple fetches for the same ID
    let cancelled = false;
    
    setIsLoading(true);
    postsAPI.getPost(postId).then(result => {
      if (cancelled) return;
      
      if (result.success && result.data) {
        setPost(result.data);
        setEditedData({
          title: result.data.title,
          content: result.data.content,
        });
      } else {
        toast.error('Failed to load post');
        onClose();
      }
      setIsLoading(false);
    });
    
    return () => {
      cancelled = true;
    };
  }, [postId, externalPost, isOpen]); // Removed unstable dependencies: toast, onClose

  const handleSave = async () => {
    if (!post) return;
    
    // Validate required fields
    if (!editedData.title.trim()) {
      toast.warning("Post title is required");
      return;
    }
    if (!editedData.content.trim()) {
      toast.warning("Post content is required");
      return;
    }
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('title', editedData.title.trim());
        formData.append('content', editedData.content.trim());
        formData.append('characterCount', String(editedData.content.trim().length));
        
        const result = await postsAPI.updatePostFromForm(post.id, formData);
        
        if (result.success) {
          toast.success('Post updated successfully');
          setIsEditing(false);
          onUpdate();
          // Update local state with new data
          if (result.data) {
            setPost(result.data);
          }
        } else {
          toast.error('Failed to update post');
        }
      } catch (error) {
        toast.error('Failed to save post');
      }
    });
  };

  const handleCancel = () => {
    if (post) {
      setEditedData({
        title: post.title,
        content: post.content,
      });
    }
    setIsEditing(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-green-100 text-green-700",
      scheduled: "bg-blue-100 text-blue-700",
      published: "bg-purple-100 text-purple-700",
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get platform configuration
  const platform = post ? getPlatformConfig(post.platform) : null;
  const characterCount = editedData.content.length;
  const isOverLimit = platform ? characterCount > platform.charLimit : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          {isLoading ? (
            <>
              <DialogTitle>Loading Post</DialogTitle>
              <DialogDescription className="sr-only">
                Loading post details
              </DialogDescription>
            </>
          ) : post && platform ? (
            <>
              <DialogTitle className="text-xl pr-8">
                {isEditing ? "Edit Post" : "Post Details"}
              </DialogTitle>
              <div className="flex items-center justify-between mt-2">
                <DialogDescription className="text-sm text-gray-500">
                  {isEditing ? "Edit the post content below" : "View and manage your post content"}
                </DialogDescription>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${platform.color} text-white border-none flex items-center gap-1`}
                  >
                    <platform.icon className="h-3 w-3" />
                    {platform.label}
                  </Badge>
                  {getStatusBadge(post.status)}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogTitle>No Post Available</DialogTitle>
              <DialogDescription className="sr-only">
                No post data could be loaded
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : post && platform ? (
          <>

            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={editedData.title}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Enter post title"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={editedData.content}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      placeholder="Enter post content"
                      className="min-h-[300px] font-mono text-sm"
                      disabled={isSaving}
                      rows={12}
                    />
                    <div className="flex items-center justify-between">
                      <CharacterCount
                        count={characterCount}
                        limit={platform.charLimit}
                        platform={post.platform}
                        size="md"
                        showProgress={true}
                      />
                      {isOverLimit && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Over character limit</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Title</h3>
                    <p className="text-gray-900">{post.title}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Content</h3>
                    <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {post.content}
                    </div>
                    <CharacterCount
                      count={post.characterCount || post.content.length}
                      limit={platform.charLimit}
                      platform={post.platform}
                      size="md"
                      showProgress={true}
                    />
                  </div>


                  {(post.insightTitle || post.transcriptTitle) && (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-sm">Source Information</h3>
                      {post.insightTitle && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Insight:</span> {post.insightTitle}
                        </div>
                      )}
                      {post.transcriptTitle && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Transcript:</span> {post.transcriptTitle}
                        </div>
                      )}
                    </div>
                  )}

                  {post.scheduledFor && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Scheduled For</h3>
                      <p className="text-gray-700">
                        {new Date(post.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  )}

                </>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || isOverLimit}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  disabled={post.status === "published"}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Post
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Edit3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No post data available</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}