import { useState, useEffect, useRef } from 'react';
import { MediaService } from '../services/media.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileService, type ProfileUpdateInput } from '../services/profile.service';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'sonner';
import { ApiError, API_BASE_URL } from '../api/client';
import { getErrorMessage, getSuccessMessage } from '../utils/error';
import { useTranslation } from '../i18n/LanguageContext';
import { updateProfileSchema } from '../validations/profile.schema';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: ProfileUpdateInput) => ProfileService.updateProfile(data),
    onSuccess: async () => {
      // Re-fetch profile data from the server and update the auth store in place
      // without toggling hydrated=false to avoid UI flash
      try {
        const res = await fetch(
          `${API_BASE_URL}/profile`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (json?.data?.user) {
          useAuthStore.setState({ user: json.data.user });
        }
      } catch {
        // Silent fallback — user data will be stale but the UI won't flash
      }
      
      // Also invalidate any queries that might depend on profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Create a dummy response to trigger success toast because this doesn't return data directly?
      // Actually, wait, mutationFn returns data
      toast.success(getSuccessMessage({ slug: 'PROFILE_UPDATED' }, t as any, 'profile'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'profile'));
    },
  });
}

/**
 * Dedicated hook for uploading profile avatars.
 * Uses the /media endpoint (separate from profile update).
 * Updates the auth store with the new photo_url directly to avoid UI flash.
 */
export function useUploadAvatar() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: { file: File }) => ProfileService.uploadAvatar(data),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.slug === 'VALIDATION_ERROR') return;
      toast.error(getErrorMessage(error, t as any, 'profile'));
    },
  });
}

export function useProfileFormDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const p = t.profile || {};
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "Admin";
  
  const updateProfile = useUpdateProfile();
  const uploadPhoto = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [jobTitle, setJobTitle] = useState(user?.job_title || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photo_url || "");
  const [uploadedPhotoId, setUploadedPhotoId] = useState<string | null>(null);
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    if (open && user) {
      requestAnimationFrame(() => {
        setFullName(user.full_name || "");
        setUsername(user.username || "");
        setEmail(user.email || "");
        setJobTitle(user.job_title || "");
        setPhotoUrl(user.photo_url || "");
        setUploadedPhotoId(null);
      });
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      if (uploadedPhotoId) {
        MediaService.deleteMedia(uploadedPhotoId).catch(() => {});
        setUploadedPhotoId(null);
      }
      setOldPassword("");
      setNewPassword("");
    }
  }, [open, uploadedPhotoId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security: Client-side 2MB limit for profile photos
    const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t.common?.upload?.photo_max_size || "Photo too large");
      if (e.target) e.target.value = '';
      return;
    }

    // Security: Client-side type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t.common?.upload?.photo_allowed_types || "Invalid photo type");
      if (e.target) e.target.value = '';
      return;
    }

    setIsAvatarUploading(true);
    try {
      if (uploadedPhotoId) {
        MediaService.deleteMedia(uploadedPhotoId).catch(() => {});
      }
      const res = await uploadPhoto.mutateAsync({ file });
      setPhotoUrl(res.file_url);
      setUploadedPhotoId(res.id);
      toast.success(t.common?.upload?.photo_uploaded || "Photo uploaded successfully");
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setIsAvatarUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAvatarUploading) {
      toast.error(t.common?.upload?.wait_for_upload || "Please wait for upload to finish");
      return;
    }
    
    try {
      const payload = {
        full_name: fullName,
        username: isAdmin ? username : undefined,
        email: isAdmin ? email : undefined,
        job_title: isAdmin ? jobTitle : undefined,
        photo_url: photoUrl,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      };

      const validationResult = updateProfileSchema.safeParse(payload);
      if (!validationResult.success) {
        // Find the first error message and attempt to translate it
        const firstError = validationResult.error.issues[0].message;
        toast.error((t.common as any)?.validation?.[firstError] || firstError);
        return;
      }

      await updateProfile.mutateAsync(payload);
      
      setUploadedPhotoId(null); // Clear ID first so useEffect doesn't delete it
      setOldPassword("");
      setNewPassword("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  return {
    t, p, user, isAdmin,
    fullName, setFullName, username, setUsername, email, setEmail,
    jobTitle, setJobTitle, photoUrl, setPhotoUrl, 
    oldPassword, setOldPassword, newPassword, setNewPassword,
    showOldPass, setShowOldPass, showNewPass, setShowNewPass,
    isAvatarUploading, updateProfile, uploadPhoto,
    fileInputRef, handleFileChange, handleSubmit
  };
}
